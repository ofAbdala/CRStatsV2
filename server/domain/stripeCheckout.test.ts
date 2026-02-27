import test from "node:test";
import assert from "node:assert/strict";
import { PRICING, ELITE_PRICING } from "@shared/pricing";
import { getAllowedCheckoutPriceIds, getAllowedProCheckoutPriceIds, validateCheckoutPriceId, getPlanFromPriceId } from "./stripeCheckout";

test("checkout allowlist: includes BRL monthly and yearly (when configured)", () => {
  const allowed = new Set(getAllowedCheckoutPriceIds());
  assert.equal(allowed.has(PRICING.BRL.monthlyPriceId), true);

  if (typeof PRICING.BRL.yearlyPriceId === "string" && PRICING.BRL.yearlyPriceId) {
    assert.equal(allowed.has(PRICING.BRL.yearlyPriceId), true);
  }

  // Elite prices only included if configured (non-empty)
  if (typeof ELITE_PRICING.BRL.monthlyPriceId === "string" && ELITE_PRICING.BRL.monthlyPriceId) {
    assert.equal(allowed.has(ELITE_PRICING.BRL.monthlyPriceId), true);
  }
  if (typeof ELITE_PRICING.BRL.yearlyPriceId === "string" && ELITE_PRICING.BRL.yearlyPriceId) {
    assert.equal(allowed.has(ELITE_PRICING.BRL.yearlyPriceId), true);
  }
});

test("getAllowedProCheckoutPriceIds is alias for getAllowedCheckoutPriceIds", () => {
  const a = getAllowedProCheckoutPriceIds();
  const b = getAllowedCheckoutPriceIds();
  assert.deepEqual(a, b);
});

test("validateCheckoutPriceId: missing => PRICE_ID_REQUIRED", () => {
  assert.deepEqual(validateCheckoutPriceId(undefined), { ok: false, code: "PRICE_ID_REQUIRED" });
  assert.deepEqual(validateCheckoutPriceId(""), { ok: false, code: "PRICE_ID_REQUIRED" });
  assert.deepEqual(validateCheckoutPriceId("   "), { ok: false, code: "PRICE_ID_REQUIRED" });
});

test("validateCheckoutPriceId: unknown => INVALID_PRICE_ID", () => {
  assert.deepEqual(validateCheckoutPriceId("price_not_allowed"), { ok: false, code: "INVALID_PRICE_ID" });
});

test("validateCheckoutPriceId: valid PRO monthly => ok", () => {
  const result = validateCheckoutPriceId(PRICING.BRL.monthlyPriceId);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.priceId, PRICING.BRL.monthlyPriceId);
  }
});

test("getPlanFromPriceId: PRO price => 'pro'", () => {
  assert.equal(getPlanFromPriceId(PRICING.BRL.monthlyPriceId), "pro");
  if (typeof PRICING.BRL.yearlyPriceId === "string" && PRICING.BRL.yearlyPriceId) {
    assert.equal(getPlanFromPriceId(PRICING.BRL.yearlyPriceId), "pro");
  }
});

test("getPlanFromPriceId: Elite price => 'elite' (when configured)", () => {
  if (typeof ELITE_PRICING.BRL.monthlyPriceId === "string" && ELITE_PRICING.BRL.monthlyPriceId) {
    assert.equal(getPlanFromPriceId(ELITE_PRICING.BRL.monthlyPriceId), "elite");
  }
});

test("getPlanFromPriceId: unknown => null", () => {
  assert.equal(getPlanFromPriceId("price_unknown"), null);
});
