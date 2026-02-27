/**
 * Stripe webhook event handler — extracted from billing.ts for line-count compliance.
 * Processes Stripe webhook events and updates subscription state.
 */
import Stripe from "stripe";
import { serviceStorage } from "../storage";
import { getStripeSubscriptionPeriodEnd, createNotificationIfAllowed } from "./utils";
import { getPlanFromPriceId } from "../domain/stripeCheckout";

/** Detect the plan (pro/elite) from a Stripe subscription's price ID. */
function detectPlanFromSubscription(stripeSub: Stripe.Subscription | null): 'pro' | 'elite' {
  if (!stripeSub?.items?.data?.length) return 'pro';

  const priceId = stripeSub.items.data[0]?.price?.id;
  if (!priceId) return 'pro';

  const detected = getPlanFromPriceId(priceId);
  return detected === 'elite' ? 'elite' : 'pro';
}

export async function handleWebhookEvent(event: Stripe.Event, stripe: Stripe) {
  const storage = serviceStorage;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session?.metadata?.userId && session?.subscription) {
        const userId = session.metadata.userId;
        const subscription = await storage.getSubscription(userId);
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        let stripeSubscription: Stripe.Subscription | null = null;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } catch (subscriptionFetchError) {
          console.warn("Failed to retrieve Stripe subscription on checkout completion:", subscriptionFetchError);
        }

        const plan = detectPlanFromSubscription(stripeSubscription);

        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            stripeSubscriptionId,
            plan,
            status: stripeSubscription?.status === "active" ? "active" : "inactive",
            currentPeriodEnd:
              getStripeSubscriptionPeriodEnd(stripeSubscription) ??
              subscription.currentPeriodEnd ??
              null,
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
          });
          console.log(`${plan.toUpperCase()} activated for user: ${userId}`);

          await createNotificationIfAllowed(storage, userId, "billing", {
            title: 'notifications.billing.activated.title',
            description: 'notifications.billing.activated.description',
            type: 'success',
          });
        } else {
          await storage.createSubscription({
            userId,
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripeSubscriptionId,
            plan,
            status: stripeSubscription?.status === "active" ? "active" : "inactive",
            currentPeriodEnd: getStripeSubscriptionPeriodEnd(stripeSubscription),
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
          });
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscriptionData = event.data.object as Stripe.Subscription;
      if (subscriptionData?.id) {
        const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
        if (existing) {
          const status = subscriptionData.status === 'active' ? 'active' :
            subscriptionData.status === 'canceled' ? 'canceled' :
              subscriptionData.status;
          const plan = status === "active"
            ? detectPlanFromSubscription(subscriptionData)
            : existing.plan;
          await storage.updateSubscription(existing.id, {
            status: status,
            plan,
            currentPeriodEnd:
              getStripeSubscriptionPeriodEnd(subscriptionData) ??
              existing.currentPeriodEnd ??
              null,
            cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
          });
          console.log(`Subscription ${subscriptionData.id} updated to: ${status} (plan: ${plan})`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscriptionData = event.data.object as Stripe.Subscription;
      if (subscriptionData?.id) {
        const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
        if (existing) {
          await storage.updateSubscription(existing.id, {
            plan: 'free',
            status: 'canceled',
            currentPeriodEnd:
              getStripeSubscriptionPeriodEnd(subscriptionData) ??
              existing.currentPeriodEnd ??
              null,
            cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
          });
          console.log(`Subscription ${subscriptionData.id} canceled`);

          await createNotificationIfAllowed(storage, existing.userId, "billing", {
            title: 'notifications.billing.canceled.title',
            description: 'notifications.billing.canceled.description',
            type: 'warning',
          });
        }
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const subscriptionId =
        typeof invoice?.subscription === "string"
          ? invoice.subscription
          : invoice?.subscription?.id;
      const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;

      if (subscriptionId) {
        const existing = await storage.getSubscriptionByStripeId(subscriptionId);
        if (existing) {
          // Detect plan from the invoice line item price
          // In newer Stripe API versions, price is at pricing.price_details.price (string)
          const invoicePriceId = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
          const plan = invoicePriceId
            ? (getPlanFromPriceId(invoicePriceId) ?? existing.plan)
            : existing.plan;

          await storage.updateSubscription(existing.id, {
            plan: plan || "pro",
            status: "active",
            currentPeriodEnd:
              typeof periodEndUnix === "number"
                ? new Date(periodEndUnix * 1000)
                : existing.currentPeriodEnd ?? null,
          });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const subscriptionId =
        typeof invoice?.subscription === "string"
          ? invoice.subscription
          : invoice?.subscription?.id;

      if (subscriptionId) {
        const existing = await storage.getSubscriptionByStripeId(subscriptionId);
        if (existing) {
          await storage.updateSubscription(existing.id, {
            status: 'past_due',
          });
          console.log(`Subscription ${subscriptionId} marked as past_due due to payment failure`);

          await createNotificationIfAllowed(storage, existing.userId, "billing", {
            title: 'notifications.billing.paymentFailed.title',
            description: 'notifications.billing.paymentFailed.description',
            type: 'error',
          });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}
