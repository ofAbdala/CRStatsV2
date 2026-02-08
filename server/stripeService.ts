// From Stripe connection integration
import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async createCheckoutSession(
    customerId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    userId: string
  ) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getOrCreateCustomer(userId: string, email: string) {
    const subscription = await storage.getSubscription(userId);
    
    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    const customer = await this.createCustomer(email, userId);

    if (subscription) {
      await storage.updateSubscription(subscription.id, {
        stripeCustomerId: customer.id,
      });
      return customer.id;
    }

    await storage.createSubscription({
      userId,
      stripeCustomerId: customer.id,
      plan: "free",
      status: "inactive",
    });

    return customer.id;
  }
}

export const stripeService = new StripeService();
