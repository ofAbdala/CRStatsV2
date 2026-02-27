/**
 * Integration tests for user settings routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountSettingsRoutes } from "../helpers/app";

test("Settings GET: returns settings with notification preferences", async () => {
  const { app, mockStorage } = createTestApp();
  mountSettingsRoutes(app, mockStorage);

  const res = await request(app).get("/api/settings");
  assert.equal(res.status, 200);
  assert.ok(res.body.theme);
  assert.ok(res.body.notificationPreferences);
  assert.equal(typeof res.body.notificationPreferences.training, "boolean");
  assert.equal(typeof res.body.notificationPreferences.billing, "boolean");
  assert.equal(typeof res.body.notificationPreferences.system, "boolean");
});

test("Settings PATCH: updates settings", async () => {
  let updatedPayload: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async updateUserSettings(userId, data) {
        updatedPayload = data;
        return { id: "s-1", userId, ...data } as any;
      },
    },
  });

  mountSettingsRoutes(app, mockStorage);

  const res = await request(app).patch("/api/settings").send({ theme: "light" });
  assert.equal(res.status, 200);
  assert.ok(updatedPayload);
  assert.equal(updatedPayload.theme, "light");
});

test("Settings: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountSettingsRoutes(app, mockStorage);

  const res = await request(app).get("/api/settings");
  assert.equal(res.status, 401);
});
