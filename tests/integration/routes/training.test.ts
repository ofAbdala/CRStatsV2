/**
 * Integration tests for training routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountTrainingRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

test("Training Plan GET: PRO user gets active plan", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async getActivePlan(userId) {
        return { id: "tp-1", userId, title: "Push Training", status: "active" } as any;
      },
      async getDrillsByPlan() {
        return [
          { id: "d-1", planId: "tp-1", focusArea: "Elixir", description: "Track elixir leaks", status: "pending" },
        ] as any;
      },
    },
  });

  mountTrainingRoutes(app, mockStorage);

  const res = await request(app).get("/api/training/plan");
  assert.equal(res.status, 200);
  assert.equal(res.body.title, "Push Training");
  assert.ok(Array.isArray(res.body.drills));
  assert.equal(res.body.drills.length, 1);
});

test("Training Plan GET: free user gets 403", async () => {
  const { app, mockStorage } = createTestApp({
    storage: { async isPro() { return false; } },
  });

  mountTrainingRoutes(app, mockStorage);

  const res = await request(app).get("/api/training/plan");
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "PRO_REQUIRED");
});

test("Training Plan GET: PRO user with no plan gets null", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async getActivePlan() { return undefined; },
    },
  });

  mountTrainingRoutes(app, mockStorage);

  const res = await request(app).get("/api/training/plan");
  assert.equal(res.status, 200);
  assert.equal(res.body, null);
});

test("Training Plans GET: PRO user gets plan list", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async getTrainingPlans() {
        return [
          { id: "tp-1", userId: TEST_USER_ID, title: "Plan 1", status: "active" },
          { id: "tp-2", userId: TEST_USER_ID, title: "Plan 2", status: "archived" },
        ] as any;
      },
    },
  });

  mountTrainingRoutes(app, mockStorage);

  const res = await request(app).get("/api/training/plans");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
});
