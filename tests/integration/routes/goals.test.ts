/**
 * Integration tests for goals routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountGoalRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

test("Goals GET: returns user goals", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getGoals() {
        return [
          { id: "g-1", userId: TEST_USER_ID, title: "Reach 6000 trophies", type: "trophies", targetValue: 6000, currentValue: 5500, completed: false },
        ] as any;
      },
    },
  });

  mountGoalRoutes(app, mockStorage);

  const res = await request(app).get("/api/goals");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].title, "Reach 6000 trophies");
});

test("Goals POST: creates a new goal", async () => {
  let createdGoal: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async createGoal(goal) {
        createdGoal = goal;
        return { id: "g-new", ...goal } as any;
      },
    },
  });

  mountGoalRoutes(app, mockStorage);

  const res = await request(app).post("/api/goals").send({
    title: "Win 10 matches",
    type: "wins",
    targetValue: 10,
  });

  assert.equal(res.status, 200);
  assert.ok(createdGoal);
  assert.equal(createdGoal.title, "Win 10 matches");
  assert.equal(createdGoal.userId, TEST_USER_ID);
});

test("Goals DELETE: deletes existing goal", async () => {
  let deleteCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getGoal(id) {
        return { id, userId: TEST_USER_ID, title: "Test" } as any;
      },
      async deleteGoal() { deleteCalled = true; },
    },
  });

  mountGoalRoutes(app, mockStorage);

  const res = await request(app).delete("/api/goals/g-1");
  assert.equal(res.status, 200);
  assert.ok(deleteCalled);
  assert.deepEqual(res.body, { success: true });
});

test("Goals DELETE: returns 404 for non-existent goal", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getGoal() { return undefined; },
    },
  });

  mountGoalRoutes(app, mockStorage);

  const res = await request(app).delete("/api/goals/nonexistent");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "GOAL_NOT_FOUND");
});
