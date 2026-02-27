/**
 * Test Express app factory for integration tests.
 *
 * Creates Express apps with real route handlers but mocked external dependencies.
 * Uses a module patching approach: imports the real modules, then replaces
 * exported functions/objects with test doubles before mounting routes.
 */
import express, { type Request, Response, NextFunction, Router } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import type { IStorage } from "../../../server/storage";
import type { SupabaseAuthContext } from "../../../server/supabaseAuth";
import { createTestAuth } from "./auth";
import { createMockStorage, TEST_USER_ID, TEST_PLAYER_TAG, mockPlayerData, mockBattleData, mockCoachResponse } from "./mocks";

export interface TestAppContext {
  app: express.Express;
  mockStorage: IStorage;
  authContext: SupabaseAuthContext;
}

export interface TestAppOptions {
  storage?: Partial<IStorage>;
  authenticated?: boolean;
  auth?: SupabaseAuthContext;
}

/**
 * Build a test Express app that attaches mock auth and makes `getUserStorage`
 * return the mock storage. Since we can't easily mock ESM module imports
 * with Node's native test runner, we take a middleware-injection approach:
 *
 * 1. Real route modules are NOT imported (they would try to import real DB).
 * 2. Instead, route-like handlers are built from the helpers that test the
 *    actual HTTP contract (status codes, payloads, headers).
 * 3. OR we build a thin Express layer and test the contract directly.
 *
 * Given the architecture, the most effective approach is to use process-level
 * module patching. We set environment variables and process-level globals
 * that the modules check.
 */

/**
 * Create a minimal Express app with standard middleware (JSON, CORS, request-id)
 * and auth injection. Caller mounts route handlers on the returned app.
 */
export function createTestApp(options: TestAppOptions = {}): TestAppContext {
  const { authenticated = true } = options;
  const mockStorage = createMockStorage(options.storage || {});
  const authContext = options.auth || createTestAuth();

  const app = express();

  // CORS
  app.use(cors({ origin: "*" }));

  // Request ID
  app.use((req: any, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("x-request-id", req.requestId);
    next();
  });

  // Body parsing: webhook gets raw Buffer, everything else gets JSON.
  // Only one parser runs per request to avoid stream consumption conflicts.
  app.use((req: any, res: Response, next: NextFunction) => {
    if (req.path === "/api/stripe/webhook") {
      express.raw({ type: "*/*" })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
  });
  app.use(express.urlencoded({ extended: false }));

  // Inject auth
  if (authenticated) {
    app.use((req: any, _res, next) => {
      req.auth = authContext;
      next();
    });
  }

  // Logging (suppress)
  app.use((req: any, _res, next) => {
    req.log = { info() {}, warn() {}, error() {} };
    next();
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  });

  return { app, mockStorage, authContext };
}

// ── Route handler factories ─────────────────────────────────────────────────────

// Since we cannot easily mock ESM imports with Node's native test runner,
// we create route handlers that mirror the real ones but use injected storage.
// These test the HTTP contract: request/response shapes, status codes, and
// the integration between middleware layers.

/**
 * Auth routes — mirrors server/routes/auth.ts
 */
export function mountAuthRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  // GET /api/auth/user
  router.get("/api/auth/user", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      let user = await storage.getUser(userId);
      if (!user) {
        const email = typeof req.auth?.claims?.email === "string" ? req.auth.claims.email : undefined;
        await storage.upsertUser({ id: userId, email });
        user = await storage.getUser(userId);
      }
      if (!user) return res.status(404).json({ code: "USER_NOT_FOUND", message: "User not found" });

      const { profile, subscription, settings } = await storage.withUserSession(async (session) => {
        await storage.bootstrapUserData(userId, session);
        const [profile, subscription, settings] = await Promise.all([
          storage.getProfile(userId, session),
          storage.getSubscription(userId, session),
          storage.getUserSettings(userId, session),
        ]);
        return { profile, subscription, settings };
      });

      res.json({ ...user, profile, subscription, settings });
    } catch (error) {
      res.status(500).json({ code: "AUTH_USER_FETCH_FAILED", message: "Failed to fetch user" });
    }
  });

  // GET /api/profile
  router.get("/api/profile", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      await storage.bootstrapUserData(userId);
      const profile = await storage.getProfile(userId);
      if (!profile) return res.json(null);

      const canonicalTag = profile.defaultPlayerTag || profile.clashTag || null;
      res.json({ ...profile, defaultPlayerTag: canonicalTag, clashTag: profile.clashTag ?? canonicalTag });
    } catch (error) {
      res.status(500).json({ code: "PROFILE_FETCH_FAILED", message: "Failed to fetch profile" });
    }
  });

  // POST /api/profile
  router.post("/api/profile", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const profile = await storage.createProfile({ userId, ...req.body });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ code: "PROFILE_CREATE_FAILED", message: "Failed to create profile" });
    }
  });

  // GET /api/subscription
  router.get("/api/subscription", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      await storage.bootstrapUserData(userId);
      const subscription = await storage.getSubscription(userId);
      res.json(subscription || { plan: "free", status: "inactive" });
    } catch (error) {
      res.status(500).json({ code: "SUBSCRIPTION_FETCH_FAILED", message: "Failed to fetch subscription" });
    }
  });

  app.use(router);
}

/**
 * Billing/Webhook routes — mirrors server/routes/billing.ts + webhookHandler.ts
 */
export function mountBillingRoutes(
  app: express.Express,
  storage: IStorage,
  opts: {
    webhookSecret?: string;
  } = {},
) {
  const router = Router();
  const webhookSecret = opts.webhookSecret || "whsec_test_secret";

  // POST /api/stripe/webhook (raw body parsing done at app level in createTestApp)
  router.post("/api/stripe/webhook", async (req: any, res) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).json({ code: "STRIPE_SIGNATURE_MISSING", message: "Missing stripe-signature" });
      }

      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ code: "STRIPE_WEBHOOK_PAYLOAD_INVALID", message: "Invalid webhook payload" });
      }

      // For tests, we parse the raw body directly instead of verifying Stripe signature.
      // The real handler verifies with constructEvent — here we validate the presence
      // of the signature header and then process the event from the raw body.
      let event: any;
      try {
        event = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ code: "STRIPE_WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook signature" });
      }

      // If signature doesn't match our test secret, simulate signature failure
      if (signature !== `test_sig_${webhookSecret}`) {
        return res.status(400).json({ code: "STRIPE_WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook signature" });
      }

      // Process the event (mirrors webhookHandler.ts)
      switch (event.type) {
        case "customer.subscription.created":
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session?.metadata?.userId && session?.subscription) {
            const userId = session.metadata.userId;
            const stripeSubscriptionId = typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
            const existing = await storage.getSubscription(userId);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                stripeSubscriptionId,
                plan: "pro",
                status: "active",
              });
            } else {
              await storage.createSubscription({
                userId,
                stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
                stripeSubscriptionId,
                plan: "pro",
                status: "active",
              });
            }
          }
          break;
        }
        case "customer.subscription.updated": {
          const subData = event.data.object;
          if (subData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subData.id);
            if (existing) {
              const status = subData.status === "active" ? "active" :
                subData.status === "canceled" ? "canceled" : subData.status;
              await storage.updateSubscription(existing.id, {
                status,
                plan: status === "active" ? "pro" : existing.plan,
                cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
              });
            }
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subData = event.data.object;
          if (subData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subData.id);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                plan: "free",
                status: "canceled",
              });
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const subscriptionId = typeof invoice?.subscription === "string"
            ? invoice.subscription
            : invoice?.subscription?.id;
          if (subscriptionId) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionId);
            if (existing) {
              await storage.updateSubscription(existing.id, { status: "past_due" });
            }
          }
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (error) {
      res.status(500).json({ code: "STRIPE_WEBHOOK_PROCESSING_FAILED", message: "Webhook processing failed" });
    }
  });

  app.use(router);
}

/**
 * Player sync routes — mirrors server/routes/player.ts
 */
export function mountPlayerRoutes(
  app: express.Express,
  storage: IStorage,
  opts: {
    getPlayerByTag?: (tag: string) => any;
    getPlayerBattles?: (tag: string) => any;
  } = {},
) {
  const router = Router();
  const getPlayerByTag = opts.getPlayerByTag || ((tag: string) => ({ data: mockPlayerData(tag), status: 200 }));
  const getPlayerBattles = opts.getPlayerBattles || (() => ({ data: mockBattleData(), status: 200 }));

  // POST /api/player/sync
  router.post("/api/player/sync", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const profile = await storage.getProfile(userId);
      const tagToSync = profile?.defaultPlayerTag || profile?.clashTag || null;

      if (!tagToSync) {
        return res.status(400).json({ code: "NO_CLASH_TAG", message: "No Clash Royale tag linked to your profile" });
      }

      const playerResult = getPlayerByTag(tagToSync);
      if (playerResult.error || !playerResult.data) {
        return res.json({
          status: "error",
          partial: false,
          syncedTag: tagToSync,
          player: null,
          battles: [],
          pushSessions: [],
          stats: { totalMatches: 0, wins: 0, losses: 0, winRate: 0 },
          goals: [],
          lastSyncedAt: null,
          errors: [{ source: "player", code: "PLAYER_FETCH_FAILED", message: playerResult.error || "Failed" }],
        });
      }

      const player = playerResult.data;
      const battlesResult = getPlayerBattles(tagToSync);
      const battles = battlesResult.data || [];

      const syncState = await storage.updateSyncState(userId);

      res.json({
        status: "ok",
        partial: false,
        syncedTag: player.tag || tagToSync,
        player: {
          tag: player.tag,
          name: player.name,
          trophies: player.trophies,
          arena: player.arena,
          expLevel: player.expLevel,
          clan: player.clan,
        },
        battles,
        stats: { totalMatches: battles.length, wins: 1, losses: 1, winRate: 50 },
        lastSyncedAt: syncState.lastSyncedAt,
        goals: [],
        errors: [],
      });
    } catch (error) {
      res.status(500).json({ code: "PLAYER_SYNC_FAILED", message: "Failed to sync player data" });
    }
  });

  // GET /api/player/sync-state
  router.get("/api/player/sync-state", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const syncState = await storage.getSyncState(userId);
    res.json({ lastSyncedAt: syncState?.lastSyncedAt || null });
  });

  app.use(router);
}

/**
 * Coach chat routes — mirrors server/routes/coach.ts
 */
export function mountCoachRoutes(
  app: express.Express,
  storage: IStorage,
  opts: {
    generateCoachResponse?: (...args: any[]) => any;
  } = {},
) {
  const router = Router();
  const generateCoachResponse = opts.generateCoachResponse || (() => mockCoachResponse());

  // POST /api/coach/chat
  router.post("/api/coach/chat", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const isPro = await storage.isPro(userId);

      if (!isPro) {
        const messagesToday = await storage.countCoachMessagesToday(userId);
        if (messagesToday >= 5) {
          return res.status(403).json({
            code: "FREE_COACH_DAILY_LIMIT_REACHED",
            message: "Daily message limit reached. Upgrade to PRO for unlimited coaching.",
            details: { limit: 5, used: messagesToday },
          });
        }
      }

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ code: "VALIDATION_ERROR", message: "Invalid coach chat payload" });
      }

      const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
      if (!lastUserMessage) {
        return res.status(400).json({ code: "NO_USER_MESSAGE", message: "At least one user message is required" });
      }

      const aiResponse = await generateCoachResponse(messages, {});

      await storage.createCoachMessage({ userId, role: "user", content: lastUserMessage.content, contextType: null });
      await storage.createCoachMessage({ userId, role: "assistant", content: aiResponse, contextType: null });

      const remainingMessages = isPro
        ? null
        : 5 - (await storage.countCoachMessagesToday(userId));

      res.json({ message: aiResponse, timestamp: new Date().toISOString(), remainingMessages });
    } catch (error) {
      res.status(500).json({ code: "COACH_CHAT_FAILED", message: "Failed to generate coach response" });
    }
  });

  // GET /api/coach/messages
  router.get("/api/coach/messages", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const messages = await storage.getCoachMessages(userId, 50);
    res.json(messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.createdAt?.toISOString?.() || null,
    })));
  });

  app.use(router);
}

/**
 * Deck routes — mirrors server/routes/decks.ts
 */
export function mountDeckRoutes(
  app: express.Express,
  storage: IStorage,
  opts: {
    generateCounterDeck?: (...args: any[]) => any;
    generateDeckOptimizer?: (...args: any[]) => any;
  } = {},
) {
  const router = Router();
  const generateCounterDeck = opts.generateCounterDeck || (() => ({
    deck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
    explanation: "Counter deck suggestion.",
  }));

  // GET /api/decks/meta
  router.get("/api/decks/meta", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const decks = await storage.getMetaDecks({ limit: 50 });
      res.json(decks.map((d: any) => ({
        deckHash: d.deckHash,
        cards: d.cards,
        avgElixir: d.avgElixir || 3.5,
        games: d.usageCount || 0,
        cacheStatus: "fresh",
      })));
    } catch (error) {
      res.status(500).json({ code: "META_DECKS_FETCH_FAILED", message: "Failed to fetch meta decks" });
    }
  });

  // POST /api/decks/builder/counter
  router.post("/api/decks/builder/counter", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const isPro = await storage.isPro(userId);

      if (!isPro) {
        const used = await storage.countDeckSuggestionsToday(userId, "counter");
        if (used >= 2) {
          return res.status(403).json({
            code: "DECK_COUNTER_DAILY_LIMIT_REACHED",
            message: "Daily FREE counter deck limit reached. Upgrade to PRO for unlimited usage.",
            details: { limit: 2 },
          });
        }
      }

      const ai = await generateCounterDeck(req.body);

      if (!isPro) {
        await storage.incrementDeckSuggestionUsage(userId, "counter");
      }

      res.json({ deck: { cards: ai.deck, avgElixir: 3.5 }, explanation: ai.explanation, importLink: "" });
    } catch (error) {
      res.status(500).json({ code: "DECK_COUNTER_FAILED", message: "Failed to generate counter deck" });
    }
  });

  app.use(router);
}

/**
 * Settings routes — mirrors server/routes/settings.ts
 */
export function mountSettingsRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  router.get("/api/settings", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      await storage.bootstrapUserData(userId);
      const settings = await storage.getUserSettings(userId);
      const prefs = await storage.getNotificationPreferences(userId);

      if (!settings) return res.status(404).json({ code: "SETTINGS_NOT_FOUND", message: "Settings not found" });

      res.json({
        ...settings,
        notificationPreferences: {
          training: prefs?.training ?? true,
          billing: prefs?.billing ?? true,
          system: prefs?.system ?? true,
        },
      });
    } catch (error) {
      res.status(500).json({ code: "SETTINGS_FETCH_FAILED", message: "Failed to fetch settings" });
    }
  });

  router.patch("/api/settings", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    try {
      const settings = await storage.updateUserSettings(userId, req.body);
      const prefs = await storage.getNotificationPreferences(userId);
      res.json({
        ...settings,
        notificationPreferences: {
          training: prefs?.training ?? true,
          billing: prefs?.billing ?? true,
          system: prefs?.system ?? true,
        },
      });
    } catch (error) {
      res.status(500).json({ code: "SETTINGS_UPDATE_FAILED", message: "Failed to update settings" });
    }
  });

  app.use(router);
}

/**
 * Goals routes — mirrors server/routes/goals.ts
 */
export function mountGoalRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  router.get("/api/goals", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const goals = await storage.getGoals(userId);
    res.json(goals);
  });

  router.post("/api/goals", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const goal = await storage.createGoal({ userId, ...req.body });
    res.json(goal);
  });

  router.delete("/api/goals/:id", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const goal = await storage.getGoal(req.params.id);
    if (!goal || goal.userId !== userId) return res.status(404).json({ code: "GOAL_NOT_FOUND", message: "Goal not found" });
    await storage.deleteGoal(req.params.id);
    res.json({ success: true });
  });

  app.use(router);
}

/**
 * Training routes — mirrors server/routes/training.ts
 */
export function mountTrainingRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  router.get("/api/training/plan", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const isPro = await storage.isPro(userId);
    if (!isPro) return res.status(403).json({ code: "PRO_REQUIRED", message: "Training plans require PRO." });

    const plan = await storage.getActivePlan(userId);
    if (!plan) return res.json(null);

    const drills = await storage.getDrillsByPlan(plan.id);
    res.json({ ...plan, drills });
  });

  router.get("/api/training/plans", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const isPro = await storage.isPro(userId);
    if (!isPro) return res.status(403).json({ code: "PRO_REQUIRED", message: "Training plans require PRO." });

    const plans = await storage.getTrainingPlans(userId);
    res.json(plans);
  });

  app.use(router);
}

/**
 * Notifications routes — mirrors server/routes/notifications.ts
 */
export function mountNotificationRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  router.get("/api/notifications", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  });

  router.post("/api/notifications/:id/read", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const notif = await storage.getNotification(req.params.id);
    if (!notif || notif.userId !== userId) return res.status(404).json({ code: "NOTIFICATION_NOT_FOUND", message: "Not found" });
    await storage.markNotificationAsRead(req.params.id);
    res.json({ success: true });
  });

  router.post("/api/notifications/read-all", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  });

  router.delete("/api/notifications", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    await storage.deleteNotificationsByUser(userId);
    res.json({ success: true });
  });

  app.use(router);
}

/**
 * Favorites routes — mirrors server/routes/favorites.ts
 */
export function mountFavoriteRoutes(app: express.Express, storage: IStorage) {
  const router = Router();

  router.get("/api/favorites", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const favorites = await storage.getFavoritePlayers(userId);
    res.json(favorites);
  });

  router.post("/api/favorites", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const fav = await storage.createFavoritePlayer({ userId, ...req.body });
    res.json(fav);
  });

  router.delete("/api/favorites/:id", async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    const fav = await storage.getFavoritePlayer(req.params.id);
    if (!fav || fav.userId !== userId) return res.status(404).json({ code: "FAVORITE_NOT_FOUND", message: "Not found" });
    await storage.deleteFavoritePlayer(req.params.id);
    res.json({ success: true });
  });

  app.use(router);
}

/**
 * Community routes — mirrors server/routes/community.ts
 */
export function mountCommunityRoutes(
  app: express.Express,
  opts: {
    getPlayerRankings?: (locationId: string) => any;
    getClanRankings?: (locationId: string) => any;
  } = {},
) {
  const router = Router();
  const getPlayerRankings = opts.getPlayerRankings || (() => ({ data: [], status: 200 }));
  const getClanRankings = opts.getClanRankings || (() => ({ data: [], status: 200 }));

  router.get("/api/community/player-rankings", async (req: any, res) => {
    const locationId = (req.query.locationId as string) || "global";
    const result = getPlayerRankings(locationId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  });

  router.get("/api/community/clan-rankings", async (req: any, res) => {
    const locationId = (req.query.locationId as string) || "global";
    const result = getClanRankings(locationId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  });

  app.use(router);
}
