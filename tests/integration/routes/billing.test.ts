/**
 * Integration tests for Stripe webhook handler (billing routes).
 * Tests: customer.subscription.created, .updated, .deleted, invoice.payment_failed,
 * and invalid signature rejection.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  createTestApp,
  mountBillingRoutes,
} from "../helpers/app";
import {
  TEST_USER_ID,
  TEST_STRIPE_CUSTOMER_ID,
  TEST_STRIPE_SUBSCRIPTION_ID,
  createMockStorage,
} from "../helpers/mocks";

const WEBHOOK_SECRET = "whsec_test_secret";

function makeWebhookRequest(app: any, event: object) {
  const body = JSON.stringify(event);
  return request(app)
    .post("/api/stripe/webhook")
    .set("content-type", "application/json")
    .set("stripe-signature", `test_sig_${WEBHOOK_SECRET}`)
    .type("application/octet-stream")
    .send(body);
}

test("Stripe Webhook: checkout.session.completed creates subscription", async () => {
  let createdSub: any = null;
  let updatedSub: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscription(userId) {
        return undefined; // No existing subscription
      },
      async createSubscription(sub) {
        createdSub = sub;
        return { id: "sub-new", ...sub } as any;
      },
      async updateSubscription(id, data) {
        updatedSub = { id, ...data };
        return updatedSub;
      },
    },
  });

  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: { userId: TEST_USER_ID },
        subscription: TEST_STRIPE_SUBSCRIPTION_ID,
        customer: TEST_STRIPE_CUSTOMER_ID,
      },
    },
  };

  const res = await makeWebhookRequest(app, event);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { received: true });
  assert.ok(createdSub, "Subscription should have been created");
  assert.equal(createdSub.userId, TEST_USER_ID);
  assert.equal(createdSub.plan, "pro");
  assert.equal(createdSub.status, "active");
  assert.equal(createdSub.stripeCustomerId, TEST_STRIPE_CUSTOMER_ID);
  assert.equal(createdSub.stripeSubscriptionId, TEST_STRIPE_SUBSCRIPTION_ID);
});

test("Stripe Webhook: checkout.session.completed updates existing subscription", async () => {
  let updatedData: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscription(userId) {
        return { id: "sub-existing", userId, plan: "free", status: "inactive" } as any;
      },
      async updateSubscription(id, data) {
        updatedData = { id, ...data };
        return updatedData;
      },
    },
  });

  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: { userId: TEST_USER_ID },
        subscription: TEST_STRIPE_SUBSCRIPTION_ID,
        customer: TEST_STRIPE_CUSTOMER_ID,
      },
    },
  };

  const res = await makeWebhookRequest(app, event);
  assert.equal(res.status, 200);
  assert.ok(updatedData, "Subscription should have been updated");
  assert.equal(updatedData.id, "sub-existing");
  assert.equal(updatedData.plan, "pro");
  assert.equal(updatedData.status, "active");
});

test("Stripe Webhook: customer.subscription.updated updates status", async () => {
  let updatedData: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscriptionByStripeId(stripeId) {
        return { id: "sub-1", userId: TEST_USER_ID, plan: "pro", status: "active" } as any;
      },
      async updateSubscription(id, data) {
        updatedData = { id, ...data };
        return updatedData;
      },
    },
  });

  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: TEST_STRIPE_SUBSCRIPTION_ID,
        status: "active",
        cancel_at_period_end: true,
      },
    },
  };

  const res = await makeWebhookRequest(app, event);
  assert.equal(res.status, 200);
  assert.ok(updatedData);
  assert.equal(updatedData.status, "active");
  assert.equal(updatedData.plan, "pro");
  assert.equal(updatedData.cancelAtPeriodEnd, true);
});

test("Stripe Webhook: customer.subscription.deleted deactivates subscription", async () => {
  let updatedData: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscriptionByStripeId(stripeId) {
        return { id: "sub-1", userId: TEST_USER_ID, plan: "pro", status: "active" } as any;
      },
      async updateSubscription(id, data) {
        updatedData = { id, ...data };
        return updatedData;
      },
    },
  });

  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = {
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: TEST_STRIPE_SUBSCRIPTION_ID,
        status: "canceled",
      },
    },
  };

  const res = await makeWebhookRequest(app, event);
  assert.equal(res.status, 200);
  assert.ok(updatedData);
  assert.equal(updatedData.plan, "free");
  assert.equal(updatedData.status, "canceled");
});

test("Stripe Webhook: invoice.payment_failed marks subscription as past_due", async () => {
  let updatedData: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscriptionByStripeId(stripeId) {
        return { id: "sub-1", userId: TEST_USER_ID, plan: "pro", status: "active" } as any;
      },
      async updateSubscription(id, data) {
        updatedData = { id, ...data };
        return updatedData;
      },
    },
  });

  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = {
    type: "invoice.payment_failed",
    data: {
      object: {
        subscription: TEST_STRIPE_SUBSCRIPTION_ID,
      },
    },
  };

  const res = await makeWebhookRequest(app, event);
  assert.equal(res.status, 200);
  assert.ok(updatedData);
  assert.equal(updatedData.status, "past_due");
});

test("Stripe Webhook: invalid signature returns 400", async () => {
  const { app, mockStorage } = createTestApp();
  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = { type: "customer.subscription.created", data: { object: {} } };

  const res = await request(app)
    .post("/api/stripe/webhook")
    .set("stripe-signature", "invalid_signature")
    .type("application/octet-stream")
    .send(JSON.stringify(event));

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "STRIPE_WEBHOOK_SIGNATURE_INVALID");
});

test("Stripe Webhook: missing signature returns 400", async () => {
  const { app, mockStorage } = createTestApp();
  mountBillingRoutes(app, mockStorage, { webhookSecret: WEBHOOK_SECRET });

  const event = { type: "customer.subscription.created", data: { object: {} } };

  const res = await request(app)
    .post("/api/stripe/webhook")
    .type("application/octet-stream")
    .send(JSON.stringify(event));

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "STRIPE_SIGNATURE_MISSING");
});
