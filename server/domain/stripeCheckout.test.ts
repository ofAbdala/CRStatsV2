import test from "node:test";
import assert from "node:assert/strict";
import { PRICING } from "@shared/pricing";
import { getAllowedProCheckoutPriceIds, validateCheckoutPriceId } from "./stripeCheckout";

test("checkout allowlist: includes BRL monthly and yearly (when configured)", () => {
  const allowed = new Set(getAllowedProCheckoutPriceIds());
  assert.equal(allowed.has(PRICING.BRL.monthlyPriceId), true);

  if (typeof PRICING.BRL.yearlyPriceId === "string" && PRICING.BRL.yearlyPriceId) {
    assert.equal(allowed.has(PRICING.BRL.yearlyPriceId), true);
  }
});

test("validateCheckoutPriceId: missing => PRICE_ID_REQUIRED", () => {
  assert.deepEqual(validateCheckoutPriceId(undefined), { ok: false, code: "PRICE_ID_REQUIRED" });
  assert.deepEqual(validateCheckoutPriceId(""), { ok: false, code: "PRICE_ID_REQUIRED" });
  assert.deepEqual(validateCheckoutPriceId("   "), { ok: false, code: "PRICE_ID_REQUIRED" });
});

test("validateCheckoutPriceId: unknown => INVALID_PRICE_ID", () => {
  assert.deepEqual(validateCheckoutPriceId("price_not_allowed"), { ok: false, code: "INVALID_PRICE_ID" });
});

