/**
 * Integration tests for notifications routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountNotificationRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

test("Notifications GET: returns user notifications", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getNotifications() {
        return [
          { id: "n-1", userId: TEST_USER_ID, title: "Welcome!", type: "info", read: false, createdAt: new Date() },
        ] as any;
      },
    },
  });

  mountNotificationRoutes(app, mockStorage);

  const res = await request(app).get("/api/notifications");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].title, "Welcome!");
});

test("Notifications: mark single as read", async () => {
  let markCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getNotification(id) {
        return { id, userId: TEST_USER_ID, title: "Test", read: false } as any;
      },
      async markNotificationAsRead() { markCalled = true; },
    },
  });

  mountNotificationRoutes(app, mockStorage);

  const res = await request(app).post("/api/notifications/n-1/read").send();
  assert.equal(res.status, 200);
  assert.ok(markCalled);
  assert.deepEqual(res.body, { success: true });
});

test("Notifications: mark all as read", async () => {
  let markAllCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async markAllNotificationsAsRead() { markAllCalled = true; },
    },
  });

  mountNotificationRoutes(app, mockStorage);

  const res = await request(app).post("/api/notifications/read-all").send();
  assert.equal(res.status, 200);
  assert.ok(markAllCalled);
});

test("Notifications DELETE: clears all user notifications", async () => {
  let deleteCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async deleteNotificationsByUser() { deleteCalled = true; },
    },
  });

  mountNotificationRoutes(app, mockStorage);

  const res = await request(app).delete("/api/notifications");
  assert.equal(res.status, 200);
  assert.ok(deleteCalled);
});

test("Notifications: mark non-existent as read returns 404", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getNotification() { return undefined; },
    },
  });

  mountNotificationRoutes(app, mockStorage);

  const res = await request(app).post("/api/notifications/nonexistent/read").send();
  assert.equal(res.status, 404);
});
