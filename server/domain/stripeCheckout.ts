import { PRICING, ELITE_PRICING } from "@shared/pricing";

export function getAllowedCheckoutPriceIds(): string[] {
  return [
    PRICING.BRL.monthlyPriceId,
    PRICING.BRL.yearlyPriceId,
    ELITE_PRICING.BRL.monthlyPriceId,
    ELITE_PRICING.BRL.yearlyPriceId,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

/** @deprecated Use getAllowedCheckoutPriceIds instead */
export function getAllowedProCheckoutPriceIds(): string[] {
  return getAllowedCheckoutPriceIds();
}

export function validateCheckoutPriceId(priceId: unknown):
  | { ok: true; priceId: string }
  | { ok: false; code: "PRICE_ID_REQUIRED" | "INVALID_PRICE_ID" } {
  if (typeof priceId !== "string" || !priceId.trim()) {
    return { ok: false, code: "PRICE_ID_REQUIRED" };
  }

  const allowed = new Set(getAllowedCheckoutPriceIds());
  if (!allowed.has(priceId)) {
    return { ok: false, code: "INVALID_PRICE_ID" };
  }

  return { ok: true, priceId };
}

/** Determines which plan a Stripe price ID belongs to. */
export function getPlanFromPriceId(priceId: string): 'pro' | 'elite' | null {
  const elitePriceIds = new Set(
    [ELITE_PRICING.BRL.monthlyPriceId, ELITE_PRICING.BRL.yearlyPriceId]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
  );

  if (elitePriceIds.has(priceId)) return 'elite';

  const proPriceIds = new Set(
    [PRICING.BRL.monthlyPriceId, PRICING.BRL.yearlyPriceId]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
  );

  if (proPriceIds.has(priceId)) return 'pro';

  return null;
}
