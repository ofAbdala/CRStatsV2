/**
 * Integration tests for AI coach chat routes.
 * Tests: PRO user gets response, free user daily limit, unauthenticated 401,
 * missing user message 400.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountCoachRoutes } from "../helpers/app";
import { TEST_USER_ID, mockCoachResponse } from "../helpers/mocks";

const VALID_CHAT_PAYLOAD = {
  messages: [{ role: "user", content: "How can I improve my Hog Rider deck?" }],
};

test("Coach Chat: PRO user gets AI response", async () => {
  const expectedResponse = "Focus on elixir management and cycle speed.";
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async countCoachMessagesToday() { return 0; },
    },
  });

  mountCoachRoutes(app, mockStorage, {
    generateCoachResponse: () => expectedResponse,
  });

  const res = await request(app).post("/api/coach/chat").send(VALID_CHAT_PAYLOAD);
  assert.equal(res.status, 200);
  assert.equal(res.body.message, expectedResponse);
  assert.ok(res.body.timestamp);
  assert.equal(res.body.remainingMessages, null); // PRO = unlimited
});

test("Coach Chat: free user gets response with remaining count", async () => {
  let messageCount = 2;
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countCoachMessagesToday() { return messageCount; },
    },
  });

  mountCoachRoutes(app, mockStorage, {
    generateCoachResponse: () => mockCoachResponse(),
  });

  const res = await request(app).post("/api/coach/chat").send(VALID_CHAT_PAYLOAD);
  assert.equal(res.status, 200);
  assert.ok(res.body.message);
  assert.equal(typeof res.body.remainingMessages, "number");
});

test("Coach Chat: free user at daily limit gets 403", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countCoachMessagesToday() { return 5; }, // FREE_DAILY_LIMIT = 5
    },
  });

  mountCoachRoutes(app, mockStorage);

  const res = await request(app).post("/api/coach/chat").send(VALID_CHAT_PAYLOAD);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "FREE_COACH_DAILY_LIMIT_REACHED");
  assert.equal(res.body.details.limit, 5);
});

test("Coach Chat: free user exceeding daily limit gets 403", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countCoachMessagesToday() { return 10; },
    },
  });

  mountCoachRoutes(app, mockStorage);

  const res = await request(app).post("/api/coach/chat").send(VALID_CHAT_PAYLOAD);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "FREE_COACH_DAILY_LIMIT_REACHED");
});

test("Coach Chat: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountCoachRoutes(app, mockStorage);

  const res = await request(app).post("/api/coach/chat").send(VALID_CHAT_PAYLOAD);
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

test("Coach Chat: missing messages returns 400", async () => {
  const { app, mockStorage } = createTestApp({
    storage: { async isPro() { return true; } },
  });

  mountCoachRoutes(app, mockStorage);

  const res = await request(app).post("/api/coach/chat").send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "VALIDATION_ERROR");
});

test("Coach Chat: no user message in array returns 400", async () => {
  const { app, mockStorage } = createTestApp({
    storage: { async isPro() { return true; } },
  });

  mountCoachRoutes(app, mockStorage);

  const res = await request(app).post("/api/coach/chat").send({
    messages: [{ role: "assistant", content: "Hello!" }],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "NO_USER_MESSAGE");
});

test("Coach Messages: returns chronological messages", async () => {
  const msgs = [
    { id: "1", role: "user", content: "Hello", createdAt: new Date("2026-02-27T10:00:00Z") },
    { id: "2", role: "assistant", content: "Hi!", createdAt: new Date("2026-02-27T10:01:00Z") },
  ];
  const { app, mockStorage } = createTestApp({
    storage: {
      async getCoachMessages() { return msgs as any; },
    },
  });

  mountCoachRoutes(app, mockStorage);

  const res = await request(app).get("/api/coach/messages");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].role, "user");
  assert.equal(res.body[1].role, "assistant");
});
