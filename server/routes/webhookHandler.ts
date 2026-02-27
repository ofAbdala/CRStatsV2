/**
 * Stripe webhook event handler — extracted from billing.ts for line-count compliance.
 * Processes Stripe webhook events and updates subscription state.
 */
import Stripe from "stripe";
import { serviceStorage } from "../storage";
import { getStripeSubscriptionPeriodEnd, createNotificationIfAllowed } from "./utils";

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

        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            stripeSubscriptionId,
            plan: 'pro',
            status: stripeSubscription?.status === "active" ? "active" : "inactive",
            currentPeriodEnd:
              getStripeSubscriptionPeriodEnd(stripeSubscription) ??
              subscription.currentPeriodEnd ??
              null,
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
          });
          console.log(`PRO activated for user: ${userId}`);

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
            plan: 'pro',
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
          await storage.updateSubscription(existing.id, {
            status: status,
            plan: status === "active" ? "pro" : existing.plan,
            currentPeriodEnd:
              getStripeSubscriptionPeriodEnd(subscriptionData) ??
              existing.currentPeriodEnd ??
              null,
            cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
          });
          console.log(`Subscription ${subscriptionData.id} updated to: ${status}`);
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
          await storage.updateSubscription(existing.id, {
            plan: "pro",
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
