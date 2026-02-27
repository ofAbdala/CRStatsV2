import { serviceStorage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";
import { logger } from "./logger";

function isStripeTimeout(error: unknown): boolean {
  if (error instanceof Error && error.message.includes("timed out")) return true;
  if (error instanceof Error && (error as any).type === "StripeConnectionError") return true;
  return false;
}

function logStripeError(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const isTimeout = isStripeTimeout(error);

  logger.error(isTimeout ? "Stripe API timeout" : "Stripe API error", {
    provider: "stripe",
    operation,
    message,
    ...(isTimeout ? { timeoutMs: 10_000 } : {}),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const start = Date.now();
    try {
      const stripe = await getUncachableStripeClient();
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      logger.debug("Stripe createCustomer succeeded", {
        provider: "stripe",
        operation: "createCustomer",
        durationMs: Date.now() - start,
      });
      return customer;
    } catch (error) {
      logStripeError("createCustomer", error);
      throw error;
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    userId: string
  ) {
    const start = Date.now();
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId },
      });
      logger.debug("Stripe createCheckoutSession succeeded", {
        provider: "stripe",
        operation: "createCheckoutSession",
        durationMs: Date.now() - start,
      });
      return session;
    } catch (error) {
      logStripeError("createCheckoutSession", error);
      throw error;
    }
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const start = Date.now();
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      logger.debug("Stripe createCustomerPortalSession succeeded", {
        provider: "stripe",
        operation: "createCustomerPortalSession",
        durationMs: Date.now() - start,
      });
      return session;
    } catch (error) {
      logStripeError("createCustomerPortalSession", error);
      throw error;
    }
  }

  async getOrCreateCustomer(userId: string, email: string) {
    const subscription = await serviceStorage.getSubscription(userId);

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    const customer = await this.createCustomer(email, userId);

    if (subscription) {
      await serviceStorage.updateSubscription(subscription.id, {
        stripeCustomerId: customer.id,
      });
      return customer.id;
    }

    await serviceStorage.createSubscription({
      userId,
      stripeCustomerId: customer.id,
      plan: "free",
      status: "inactive",
    });

    return customer.id;
  }
}

export const stripeService = new StripeService();
