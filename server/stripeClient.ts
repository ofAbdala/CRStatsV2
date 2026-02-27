import Stripe from "stripe";

/** Timeout in milliseconds for Stripe API requests (AC9). */
const STRIPE_TIMEOUT_MS = 10_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

let stripeClient: Stripe | null = null;

export async function getUncachableStripeClient() {
  // Historically this was "uncachable" because credentials came from the Replit connector.
  // With standard env keys, caching is safe; we keep the old API for minimal churn.
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      timeout: STRIPE_TIMEOUT_MS,
    });
  }
  return stripeClient;
}

export async function getStripePublishableKey() {
  return requireEnv("STRIPE_PUBLISHABLE_KEY");
}

export async function getStripeSecretKey() {
  return requireEnv("STRIPE_SECRET_KEY");
}
