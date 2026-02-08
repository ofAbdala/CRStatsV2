import Stripe from "stripe";

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
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return stripeClient;
}

export async function getStripePublishableKey() {
  return requireEnv("STRIPE_PUBLISHABLE_KEY");
}

export async function getStripeSecretKey() {
  return requireEnv("STRIPE_SECRET_KEY");
}
