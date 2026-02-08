import { PRICING } from "@shared/pricing";

export function getAllowedProCheckoutPriceIds(): string[] {
  return [PRICING.BRL.monthlyPriceId, PRICING.BRL.yearlyPriceId]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function validateCheckoutPriceId(priceId: unknown):
  | { ok: true; priceId: string }
  | { ok: false; code: "PRICE_ID_REQUIRED" | "INVALID_PRICE_ID" } {
  if (typeof priceId !== "string" || !priceId.trim()) {
    return { ok: false, code: "PRICE_ID_REQUIRED" };
  }

  const allowed = new Set(getAllowedProCheckoutPriceIds());
  if (!allowed.has(priceId)) {
    return { ok: false, code: "INVALID_PRICE_ID" };
  }

  return { ok: true, priceId };
}

