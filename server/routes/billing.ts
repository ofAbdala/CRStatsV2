/**
 * Stripe billing routes (checkout, portal, invoices, webhook)
 * Endpoints:
 *   GET /api/stripe/config, GET /api/stripe/products, GET /api/stripe/prices,
 *   GET /api/stripe/products-with-prices, POST /api/stripe/checkout,
 *   POST /api/stripe/portal, GET /api/billing/invoices,
 *   POST /api/stripe/webhook
 */
import express, { Router } from "express";
import Stripe from "stripe";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { stripeService } from "../stripeService";
import { getStripePublishableKey, getStripeSecretKey, getUncachableStripeClient } from "../stripeClient";
import { validateCheckoutPriceId } from "../domain/stripeCheckout";
import { ELITE_PRICING } from "@shared/pricing";
import {
  getUserId,
  sendApiError,
} from "./utils";
import { handleWebhookEvent } from "./webhookHandler";

const router = Router();

// GET /api/stripe/config
router.get('/api/stripe/config', async (req, res) => {
  const route = "/api/stripe/config";
  const userId = getUserId(req);

  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error("Error fetching Stripe config:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "STRIPE_CONFIG_FETCH_FAILED", message: "Failed to fetch Stripe configuration" },
    });
  }
});

// GET /api/stripe/products
router.get('/api/stripe/products', async (req, res) => {
  const route = "/api/stripe/products";
  const userId = getUserId(req);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }
    const stripe = await getUncachableStripeClient();
    const result = await stripe.products.list({ active: true, limit: 100 });
    res.json({ data: result.data });
  } catch (error) {
    console.error("Error fetching products:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "STRIPE_PRODUCTS_FETCH_FAILED", message: "Failed to fetch products" },
    });
  }
});

// GET /api/stripe/prices
router.get('/api/stripe/prices', async (req, res) => {
  const route = "/api/stripe/prices";
  const userId = getUserId(req);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }
    const stripe = await getUncachableStripeClient();
    const result = await stripe.prices.list({ active: true, limit: 100 });
    res.json({ data: result.data });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "STRIPE_PRICES_FETCH_FAILED", message: "Failed to fetch prices" },
    });
  }
});

// GET /api/stripe/products-with-prices
router.get('/api/stripe/products-with-prices', async (req, res) => {
  const route = "/api/stripe/products-with-prices";
  const userId = getUserId(req);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }
    const stripe = await getUncachableStripeClient();
    const [products, prices] = await Promise.all([
      stripe.products.list({ active: true, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
    ]);

    const pricesByProduct = new Map<string, Stripe.Price[]>();
    for (const price of prices.data) {
      const productId = typeof price.product === "string" ? price.product : price.product?.id;
      if (!productId) continue;
      const current = pricesByProduct.get(productId) || [];
      current.push(price);
      pricesByProduct.set(productId, current);
    }

    const data = products.data.map((product) => {
      const productPrices = (pricesByProduct.get(product.id) || [])
        .slice()
        .sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0))
        .map((price) => ({
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.active,
        }));

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        prices: productPrices,
      };
    });

    res.json({ data });
  } catch (error) {
    console.error("Error fetching products with prices:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "STRIPE_PRODUCTS_WITH_PRICES_FETCH_FAILED", message: "Failed to fetch products" },
    });
  }
});

// POST /api/stripe/checkout
router.post('/api/stripe/checkout', requireAuth, async (req: any, res) => {
  const route = "/api/stripe/checkout";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const { priceId } = req.body as { priceId?: unknown };
    const validatedPrice = validateCheckoutPriceId(priceId);
    if (!validatedPrice.ok) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: {
          code: validatedPrice.code,
          message:
            validatedPrice.code === "PRICE_ID_REQUIRED"
              ? "Price ID is required"
              : "Invalid price ID for checkout",
        },
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 404,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
    }

    const customerId = await stripeService.getOrCreateCustomer(userId, user.email || "");

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
    const session = await stripeService.createCheckoutSession(
      customerId,
      validatedPrice.priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`,
      userId,
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "CHECKOUT_SESSION_FAILED", message: "Failed to create checkout session" },
    });
  }
});

// POST /api/stripe/upgrade — PRO → Elite prorated upgrade
router.post('/api/stripe/upgrade', requireAuth, async (req: any, res) => {
  const route = "/api/stripe/upgrade";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const subscription = await storage.getSubscription(userId);

    if (!subscription?.stripeSubscriptionId || subscription.plan !== "pro" || subscription.status !== "active") {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: { code: "UPGRADE_NOT_ELIGIBLE", message: "Only active PRO subscribers can upgrade to Elite" },
      });
    }

    const { billingInterval } = req.body as { billingInterval?: string };
    const elitePriceId = billingInterval === "year" && ELITE_PRICING.BRL.yearlyPriceId
      ? ELITE_PRICING.BRL.yearlyPriceId
      : ELITE_PRICING.BRL.monthlyPriceId;

    if (!elitePriceId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "ELITE_PRICE_NOT_CONFIGURED", message: "Elite price IDs not configured" },
      });
    }

    const stripe = await getUncachableStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    if (!stripeSubscription.items?.data?.length) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: { code: "NO_SUBSCRIPTION_ITEMS", message: "Subscription has no items" },
      });
    }

    // Stripe handles proration automatically
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: elitePriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    console.log(`PRO → Elite upgrade for user: ${userId}, subscription: ${updatedSubscription.id}`);

    res.json({
      success: true,
      plan: 'elite',
      message: 'Successfully upgraded to Elite',
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "UPGRADE_FAILED", message: "Failed to upgrade subscription" },
    });
  }
});

// POST /api/stripe/portal
router.post('/api/stripe/portal', requireAuth, async (req: any, res) => {
  const route = "/api/stripe/portal";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const subscription = await storage.getSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: { code: "NO_SUBSCRIPTION", message: "No subscription found" },
      });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
    const session = await stripeService.createCustomerPortalSession(
      subscription.stripeCustomerId,
      `${baseUrl}/billing`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "PORTAL_SESSION_FAILED", message: "Failed to create customer portal session" },
    });
  }
});

// GET /api/billing/invoices
router.get('/api/billing/invoices', requireAuth, async (req: any, res) => {
  const route = "/api/billing/invoices";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const subscription = await storage.getSubscription(userId);
    if (!subscription?.stripeCustomerId) {
      return res.json([]);
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }

    const stripe = await getUncachableStripeClient();
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 20,
    });

    const response = invoices.data.map((invoice) => {
      const firstLine = invoice.lines?.data?.[0];
      const firstLinePeriod = firstLine?.period;
      return {
        id: invoice.id,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency?.toUpperCase(),
        createdAt: new Date(invoice.created * 1000).toISOString(),
        periodStart: firstLinePeriod?.start
          ? new Date(firstLinePeriod.start * 1000).toISOString()
          : null,
        periodEnd: firstLinePeriod?.end
          ? new Date(firstLinePeriod.end * 1000).toISOString()
          : null,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      };
    });

    return res.json(response);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "INVOICE_FETCH_FAILED", message: "Failed to fetch invoices" },
    });
  }
});

// POST /api/stripe/webhook
router.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: any, res) => {
  const route = "/api/stripe/webhook";
  const userId = getUserId(req);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
      });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: { code: "STRIPE_SIGNATURE_MISSING", message: "Missing stripe-signature" },
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: { code: "STRIPE_WEBHOOK_PAYLOAD_INVALID", message: "Invalid webhook payload" },
      });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 503,
        error: {
          code: "STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED",
          message: "Stripe webhook secret not configured",
        },
      });
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    const stripeSecretKey = await getStripeSecretKey();
    const stripe = new Stripe(stripeSecretKey);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error) {
      console.error("Invalid Stripe webhook signature:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 400,
        error: { code: "STRIPE_WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook signature" },
      });
    }

    console.log(`Stripe webhook received: ${event.type}`);

    await handleWebhookEvent(event, stripe);

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "stripe",
      status: 500,
      error: { code: "STRIPE_WEBHOOK_PROCESSING_FAILED", message: "Webhook processing failed" },
    });
  }
});

export default router;
