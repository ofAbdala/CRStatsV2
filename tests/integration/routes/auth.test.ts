/**
 * Integration tests for auth routes.
 * Tests: returning user (profile exists), new user (bootstrap), unauthenticated.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountAuthRoutes } from "../helpers/app";
import { TEST_USER_ID, TEST_USER_EMAIL, TEST_PLAYER_TAG } from "../helpers/mocks";

test("Auth User: returning user with profile gets full data", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getUser(id) {
        return { id, email: TEST_USER_EMAIL, createdAt: new Date() } as any;
      },
      async withUserSession(fn) {
        return fn({ conn: {} });
      },
      async bootstrapUserData() {
        return {} as any;
      },
      async getProfile(userId) {
        return {
          id: "p-1",
          userId,
          clashTag: TEST_PLAYER_TAG,
          defaultPlayerTag: TEST_PLAYER_TAG,
          displayName: "TestPlayer",
        } as any;
      },
      async getSubscription(userId) {
        return { id: "sub-1", userId, plan: "pro", status: "active" } as any;
      },
      async getUserSettings(userId) {
        return { id: "set-1", userId, theme: "dark" } as any;
      },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/auth/user");
  assert.equal(res.status, 200);
  assert.equal(res.body.id, TEST_USER_ID);
  assert.equal(res.body.email, TEST_USER_EMAIL);
  assert.ok(res.body.profile);
  assert.equal(res.body.profile.clashTag, TEST_PLAYER_TAG);
  assert.ok(res.body.subscription);
  assert.equal(res.body.subscription.plan, "pro");
  assert.ok(res.body.settings);
});

test("Auth User: new user triggers bootstrap and upsert", async () => {
  let upsertCalled = false;
  let bootstrapCalled = false;

  const { app, mockStorage } = createTestApp({
    storage: {
      async getUser(id) {
        // First call returns undefined (user does not exist),
        // second call returns the created user
        if (!upsertCalled) return undefined;
        return { id, email: TEST_USER_EMAIL, createdAt: new Date() } as any;
      },
      async upsertUser(user) {
        upsertCalled = true;
        return { id: user.id, email: user.email, createdAt: new Date() } as any;
      },
      async bootstrapUserData(userId) {
        bootstrapCalled = true;
        return {} as any;
      },
      async getProfile() { return null as any; },
      async getSubscription() { return { plan: "free", status: "inactive" } as any; },
      async getUserSettings() { return { theme: "dark" } as any; },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/auth/user");
  assert.equal(res.status, 200);
  assert.ok(upsertCalled, "upsertUser should be called for new users");
  assert.ok(bootstrapCalled, "bootstrapUserData should be called");
});

test("Auth User: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/auth/user");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

test("Profile: returns profile with canonical tag", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getProfile(userId) {
        return {
          id: "p-1",
          userId,
          clashTag: TEST_PLAYER_TAG,
          defaultPlayerTag: TEST_PLAYER_TAG,
          displayName: "TestPlayer",
        } as any;
      },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/profile");
  assert.equal(res.status, 200);
  assert.equal(res.body.clashTag, TEST_PLAYER_TAG);
  assert.equal(res.body.defaultPlayerTag, TEST_PLAYER_TAG);
});

test("Profile: returns null for user without profile", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getProfile() { return null as any; },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/profile");
  assert.equal(res.status, 200);
  assert.equal(res.body, null);
});

test("Subscription: returns subscription data", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscription(userId) {
        return { id: "sub-1", userId, plan: "pro", status: "active", stripeCustomerId: "cus_x" } as any;
      },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/subscription");
  assert.equal(res.status, 200);
  assert.equal(res.body.plan, "pro");
  assert.equal(res.body.status, "active");
});

test("Subscription: returns free plan when no subscription exists", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSubscription() { return undefined; },
    },
  });

  mountAuthRoutes(app, mockStorage);

  const res = await request(app).get("/api/subscription");
  assert.equal(res.status, 200);
  assert.equal(res.body.plan, "free");
  assert.equal(res.body.status, "inactive");
});
