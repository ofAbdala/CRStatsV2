// From javascript_log_in_with_replit blueprint
import express, { type Express, type Response } from "express";
import { type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getPlayerByTag, getPlayerBattles, getCards, getPlayerRankings, getClanRankings, getClanByTag, getClanMembers, getTopPlayersInLocation } from "./clashRoyaleApi";
import { generateCoachResponse, generatePushAnalysis, generateTrainingPlan, ChatMessage, BattleContext, PushSessionContext } from "./openai";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getStripeSecretKey, getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { PRICING } from "@shared/pricing";
import {
  coachChatInputSchema,
  favoriteCreateInputSchema,
  goalCreateInputSchema,
  goalUpdateInputSchema,
  notificationPreferencesUpdateInputSchema,
  playerSyncRequestSchema,
  profileCreateInputSchema,
  profileUpdateInputSchema,
  settingsUpdateInputSchema,
  trainingDrillUpdateInputSchema,
  trainingPlanUpdateInputSchema,
} from "@shared/schema";
import {
  type PushSession,
  computeConsecutiveLosses,
  computeGoalAutoProgress,
  computePushSessions,
  computeTiltLevel,
  evaluateFreeCoachLimit,
} from "./domain/syncRules";

const FREE_DAILY_LIMIT = 5;
const PRO_BRL_MONTHLY_PRICE_ID = PRICING.BRL.monthlyPriceId;

type ApiProvider = "internal" | "replit-oidc" | "clash-royale" | "stripe" | "openai";

interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

interface SyncErrorItem {
  source: "profile" | "player" | "battlelog" | "goals";
  code: string;
  message: string;
  status?: number;
}

function getUserId(req: any): string | null {
  return req?.user?.claims?.sub ?? null;
}

function logApiContext(
  route: string,
  userId: string | null,
  provider: ApiProvider,
  status: number,
  requestId?: string,
) {
  console.info(
    JSON.stringify({
      route,
      userId: userId ?? "anonymous",
      provider,
      status,
      requestId,
      at: new Date().toISOString(),
    }),
  );
}

function getResponseRequestId(res: Response): string | undefined {
  const headerValue = res.getHeader("x-request-id");
  if (typeof headerValue === "string") return headerValue;
  if (Array.isArray(headerValue) && typeof headerValue[0] === "string") return headerValue[0];
  return undefined;
}

function sendApiError(
  res: Response,
  {
    route,
    userId,
    provider,
    status,
    error,
  }: {
    route: string;
    userId: string | null;
    provider: ApiProvider;
    status: number;
    error: ApiErrorPayload;
  },
) {
  const requestId = getResponseRequestId(res);
  logApiContext(route, userId, provider, status, requestId);
  return res.status(status).json({
    ...error,
    requestId,
  });
}

function parseRequestBody<T>(schema: z.ZodType<T>, payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    };
  }

  return { ok: true as const, data: parsed.data };
}

function normalizeTag(tag: string | null | undefined): string | null | undefined {
  if (tag === undefined) return undefined;
  if (tag === null) return null;
  const withoutHash = tag.trim().replace(/^#/, "").toUpperCase();
  return withoutHash ? `#${withoutHash}` : null;
}

function getCanonicalProfileTag(profile: { defaultPlayerTag?: string | null; clashTag?: string | null } | null | undefined) {
  return profile?.defaultPlayerTag || profile?.clashTag || null;
}

function isTemporaryProviderStatus(status: number) {
  return status === 429 || status >= 500;
}

function getClashErrorCode(status: number) {
  if (status === 404) return "CLASH_RESOURCE_NOT_FOUND";
  if (status === 429) return "CLASH_RATE_LIMIT";
  if (status >= 500) return "CLASH_PROVIDER_UNAVAILABLE";
  return "CLASH_PROVIDER_ERROR";
}

type NotificationCategory = "training" | "billing" | "system";

async function isNotificationAllowed(userId: string, category: NotificationCategory) {
  const prefs = await storage.getNotificationPreferences(userId);
  if (prefs) {
    return prefs[category];
  }

  const settings = await storage.getUserSettings(userId);
  if (!settings) {
    return true;
  }

  if (settings.notificationsEnabled === false) {
    return false;
  }

  if (category === "training") return settings.notificationsTraining ?? true;
  if (category === "billing") return settings.notificationsBilling ?? true;
  return settings.notificationsSystem ?? true;
}

async function createNotificationIfAllowed(
  userId: string,
  category: NotificationCategory,
  payload: {
    title: string;
    description?: string | null;
    type: string;
  },
) {
  if (!(await isNotificationAllowed(userId, category))) {
    return null;
  }

  return storage.createNotification({
    userId,
    title: payload.title,
    description: payload.description ?? null,
    type: payload.type,
    read: false,
  });
}

function getStripeSubscriptionPeriodEnd(subscription: Stripe.Subscription | null | undefined): Date | null {
  const itemPeriodEnd = subscription?.items?.data?.[0]?.current_period_end;
  if (typeof itemPeriodEnd === "number") {
    return new Date(itemPeriodEnd * 1000);
  }

  return null;
}

function getBattleModeName(battle: any): string {
  return battle?.gameMode?.name || battle?.type || "Ladder";
}

function buildPushModeBreakdown(battles: any[]) {
  const byMode = new Map<string, { mode: string; matches: number; wins: number; losses: number; netTrophies: number }>();

  for (const battle of battles) {
    const mode = getBattleModeName(battle);
    const isWin = (battle?.team?.[0]?.crowns || 0) > (battle?.opponent?.[0]?.crowns || 0);
    const isLoss = (battle?.team?.[0]?.crowns || 0) < (battle?.opponent?.[0]?.crowns || 0);
    const trophyChange = battle?.team?.[0]?.trophyChange || 0;

    const current = byMode.get(mode) || { mode, matches: 0, wins: 0, losses: 0, netTrophies: 0 };
    current.matches += 1;
    if (isWin) current.wins += 1;
    if (isLoss) current.losses += 1;
    current.netTrophies += trophyChange;
    byMode.set(mode, current);
  }

  return Array.from(byMode.values()).sort((a, b) => b.matches - a.matches);
}

function computeBattleStats(battles: any[]) {
  if (!battles || battles.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      streak: { type: 'none' as const, count: 0 },
      tiltLevel: 'none' as const,
    };
  }
  
  let wins = 0;
  let losses = 0;
  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  let currentStreakType: 'win' | 'loss' | null = null;
  
  for (let i = 0; i < battles.length; i++) {
    const battle = battles[i];
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    
    if (isVictory) {
      wins++;
      if (currentStreakType === 'win') {
        streakCount++;
      } else if (currentStreakType === null) {
        currentStreakType = 'win';
        streakCount = 1;
      }
    } else {
      losses++;
      if (currentStreakType === 'loss') {
        streakCount++;
      } else if (currentStreakType === null) {
        currentStreakType = 'loss';
        streakCount = 1;
      }
    }
    
    if (i === 0) {
      streakType = isVictory ? 'win' : 'loss';
      streakCount = 1;
      currentStreakType = streakType;
    } else if (currentStreakType !== null) {
      const prevIsVictory = battles[i - 1].team?.[0]?.crowns > battles[i - 1].opponent?.[0]?.crowns;
      if ((isVictory && prevIsVictory) || (!isVictory && !prevIsVictory)) {
        if (i === 1 || streakType === (isVictory ? 'win' : 'loss')) {
          streakCount++;
        }
      } else {
        break;
      }
    }
  }
  
  let currentStreak = 0;
  let currentType: 'win' | 'loss' | 'none' = 'none';
  for (const battle of battles) {
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    const battleType = isVictory ? 'win' : 'loss';
    
    if (currentType === 'none') {
      currentType = battleType;
      currentStreak = 1;
    } else if (currentType === battleType) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return {
    totalMatches: battles.length,
    wins,
    losses,
    winRate: battles.length > 0 ? (wins / battles.length) * 100 : 0,
    streak: { type: currentType, count: currentStreak },
    tiltLevel: computeTiltLevel(battles),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    const route = "/api/auth/user";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
      }

      await storage.bootstrapUserData(userId);

      // Get associated data
      const profile = await storage.getProfile(userId);
      const subscription = await storage.getSubscription(userId);
      const settings = await storage.getUserSettings(userId);

      res.json({
        ...user,
        profile,
        subscription,
        settings,
      });
    } catch (error) {
      console.error("Error fetching auth user:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "AUTH_USER_FETCH_FAILED", message: "Failed to fetch user" },
      });
    }
  });

  // ============================================================================
  // PROFILE ROUTES
  // ============================================================================
  
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    const route = "/api/profile";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      await storage.bootstrapUserData(userId);
      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.json(null);
      }

      const canonicalTag = getCanonicalProfileTag(profile);

      res.json({
        ...profile,
        defaultPlayerTag: canonicalTag,
        clashTag: profile.clashTag ?? canonicalTag,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "PROFILE_FETCH_FAILED", message: "Failed to fetch profile" },
      });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    const route = "/api/profile";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(profileCreateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile payload",
            details: parsed.details,
          },
        });
      }

      const profile = await storage.createProfile({
        userId,
        ...parsed.data,
        clashTag: normalizeTag(parsed.data.clashTag as string | null | undefined),
        defaultPlayerTag: normalizeTag(parsed.data.defaultPlayerTag as string | null | undefined),
      });

      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "PROFILE_CREATE_FAILED", message: "Failed to create profile" },
      });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    const route = "/api/profile";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(profileUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile payload",
            details: parsed.details,
          },
        });
      }

      const profile = await storage.updateProfile(userId, {
        ...parsed.data,
        clashTag: normalizeTag(parsed.data.clashTag as string | null | undefined),
        defaultPlayerTag: normalizeTag(parsed.data.defaultPlayerTag as string | null | undefined),
      });

      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "PROFILE_UPDATE_FAILED", message: "Failed to update profile" },
      });
    }
  });

  // ============================================================================
  // SUBSCRIPTION ROUTES
  // ============================================================================
  
  app.get('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        return res.json({ plan: 'free', status: 'inactive' });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // ============================================================================
  // GOALS ROUTES
  // ============================================================================
  
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    const route = "/api/goals";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(goalCreateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid goal payload",
            details: parsed.details,
          },
        });
      }

      const goal = await storage.createGoal({ userId, ...parsed.data });
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "GOAL_CREATE_FAILED", message: "Failed to create goal" },
      });
    }
  });

  app.patch('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    const route = "/api/goals/:id";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(goalUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid goal payload",
            details: parsed.details,
          },
        });
      }

      const { id } = req.params;
      const existingGoal = await storage.getGoal(id);
      if (!existingGoal || existingGoal.userId !== userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "GOAL_NOT_FOUND", message: "Goal not found" },
        });
      }

      const goal = await storage.updateGoal(id, parsed.data);

      if (!goal) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "GOAL_NOT_FOUND", message: "Goal not found" },
        });
      }

      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "GOAL_UPDATE_FAILED", message: "Failed to update goal" },
      });
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const existingGoal = await storage.getGoal(id);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // ============================================================================
  // FAVORITE PLAYERS ROUTES
  // ============================================================================
  
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavoritePlayers(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    const route = "/api/favorites";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(favoriteCreateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid favorite payload",
            details: parsed.details,
          },
        });
      }

      const favorite = await storage.createFavoritePlayer({
        userId,
        playerTag: normalizeTag(parsed.data.playerTag) || parsed.data.playerTag,
        name: parsed.data.name,
        trophies: parsed.data.trophies,
        clan: parsed.data.clan,
      });

      if (parsed.data.setAsDefault) {
        await storage.updateProfile(userId, {
          defaultPlayerTag: favorite.playerTag,
          clashTag: favorite.playerTag,
        });
      }

      res.json(favorite);
    } catch (error) {
      console.error("Error creating favorite:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "FAVORITE_CREATE_FAILED", message: "Failed to create favorite" },
      });
    }
  });

  app.delete('/api/favorites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const existingFavorite = await storage.getFavoritePlayer(id);
      if (!existingFavorite || existingFavorite.userId !== userId) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      await storage.deleteFavoritePlayer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting favorite:", error);
      res.status(500).json({ message: "Failed to delete favorite" });
    }
  });

  // ============================================================================
  // NOTIFICATIONS ROUTES
  // ============================================================================
  
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    const route = "/api/notifications";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "NOTIFICATIONS_FETCH_FAILED", message: "Failed to fetch notifications" },
      });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    const route = "/api/notifications/:id/read";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const { id } = req.params;
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found" },
        });
      }

      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "NOTIFICATION_READ_FAILED", message: "Failed to mark notification as read" },
      });
    }
  });

  app.post('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    const route = "/api/notifications/read-all";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "NOTIFICATIONS_MARK_ALL_READ_FAILED", message: "Failed to mark all notifications as read" },
      });
    }
  });

  app.delete('/api/notifications', isAuthenticated, async (req: any, res) => {
    const route = "/api/notifications";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      await storage.deleteNotificationsByUser(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "NOTIFICATIONS_CLEAR_FAILED", message: "Failed to clear notifications" },
      });
    }
  });

  // ============================================================================
  // USER SETTINGS ROUTES
  // ============================================================================
  
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    const route = "/api/settings";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      await storage.bootstrapUserData(userId);
      const settings = await storage.getUserSettings(userId);
      const prefs = await storage.getNotificationPreferences(userId);

      if (!settings) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "SETTINGS_NOT_FOUND", message: "Settings not found" },
        });
      }

      res.json({
        ...settings,
        notificationPreferences: {
          training: prefs?.training ?? settings.notificationsTraining ?? true,
          billing: prefs?.billing ?? settings.notificationsBilling ?? true,
          system: prefs?.system ?? settings.notificationsSystem ?? true,
        },
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "SETTINGS_FETCH_FAILED", message: "Failed to fetch settings" },
      });
    }
  });

  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    const route = "/api/settings";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(settingsUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid settings payload",
            details: parsed.details,
          },
        });
      }

      const categoryPayload = {
        training: parsed.data.notificationPreferences?.training ?? parsed.data.notificationsTraining,
        billing: parsed.data.notificationPreferences?.billing ?? parsed.data.notificationsBilling,
        system: parsed.data.notificationPreferences?.system ?? parsed.data.notificationsSystem,
      };

      const settingsPayload = {
        theme: parsed.data.theme,
        preferredLanguage: parsed.data.preferredLanguage,
        defaultLandingPage: parsed.data.defaultLandingPage,
        showAdvancedStats: parsed.data.showAdvancedStats,
        notificationsEnabled: parsed.data.notificationsEnabled,
        notificationsTraining: categoryPayload.training,
        notificationsBilling: categoryPayload.billing,
        notificationsSystem: categoryPayload.system,
      };

      let settings = await storage.updateUserSettings(userId, settingsPayload);

      const hasCategoryOverride =
        categoryPayload.training !== undefined ||
        categoryPayload.billing !== undefined ||
        categoryPayload.system !== undefined;

      let prefs = await storage.getNotificationPreferences(userId);
      if (hasCategoryOverride) {
        prefs = await storage.upsertNotificationPreferences(userId, categoryPayload);

        if (parsed.data.notificationsEnabled === undefined) {
          settings = await storage.updateUserSettings(userId, {
            notificationsEnabled: prefs.training || prefs.billing || prefs.system,
          });
        }
      }

      prefs = prefs || (await storage.getNotificationPreferences(userId));

      res.json({
        ...settings,
        notificationPreferences: {
          training: prefs?.training ?? settings?.notificationsTraining ?? true,
          billing: prefs?.billing ?? settings?.notificationsBilling ?? true,
          system: prefs?.system ?? settings?.notificationsSystem ?? true,
        },
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "SETTINGS_UPDATE_FAILED", message: "Failed to update settings" },
      });
    }
  });

  // ============================================================================
  // NOTIFICATION PREFERENCES ROUTES
  // ============================================================================

  app.get('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    const route = "/api/notification-preferences";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      await storage.bootstrapUserData(userId);
      const prefs = await storage.getNotificationPreferences(userId);
      const settings = await storage.getUserSettings(userId);

      res.json({
        training: prefs?.training ?? settings?.notificationsTraining ?? true,
        billing: prefs?.billing ?? settings?.notificationsBilling ?? true,
        system: prefs?.system ?? settings?.notificationsSystem ?? true,
      });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: {
          code: "NOTIFICATION_PREFERENCES_FETCH_FAILED",
          message: "Failed to fetch notification preferences",
        },
      });
    }
  });

  app.patch('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    const route = "/api/notification-preferences";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(notificationPreferencesUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid notification preferences payload",
            details: parsed.details,
          },
        });
      }

      const updatedPrefs = await storage.upsertNotificationPreferences(userId, parsed.data);

      await storage.updateUserSettings(userId, {
        notificationsTraining: updatedPrefs.training,
        notificationsBilling: updatedPrefs.billing,
        notificationsSystem: updatedPrefs.system,
        notificationsEnabled: updatedPrefs.training || updatedPrefs.billing || updatedPrefs.system,
      });

      res.json({
        training: updatedPrefs.training,
        billing: updatedPrefs.billing,
        system: updatedPrefs.system,
      });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: {
          code: "NOTIFICATION_PREFERENCES_UPDATE_FAILED",
          message: "Failed to update notification preferences",
        },
      });
    }
  });

  // ============================================================================
  // CLASH ROYALE API ROUTES
  // ============================================================================
  
  app.get('/api/clash/player/:tag', async (req: any, res) => {
    const route = "/api/clash/player/:tag";
    const userId = getUserId(req);

    try {
      const { tag } = req.params;
      const result = await getPlayerByTag(tag);
      
      if (result.error) {
        return sendApiError(res, {
          route,
          userId,
          provider: "clash-royale",
          status: result.status,
          error: {
            code: getClashErrorCode(result.status),
            message: result.error || "Failed to fetch player data",
          },
        });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching player:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "clash-royale",
        status: 500,
        error: { code: "CLASH_PLAYER_FETCH_FAILED", message: "Failed to fetch player data" },
      });
    }
  });

  app.get('/api/clash/player/:tag/battles', async (req: any, res) => {
    const route = "/api/clash/player/:tag/battles";
    const userId = getUserId(req);

    try {
      const { tag } = req.params;
      const result = await getPlayerBattles(tag);
      
      if (result.error) {
        return sendApiError(res, {
          route,
          userId,
          provider: "clash-royale",
          status: result.status,
          error: {
            code: getClashErrorCode(result.status),
            message: result.error || "Failed to fetch battle history",
          },
        });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching battles:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "clash-royale",
        status: 500,
        error: { code: "CLASH_BATTLES_FETCH_FAILED", message: "Failed to fetch battle history" },
      });
    }
  });

  app.get('/api/clash/cards', async (req: any, res) => {
    const route = "/api/clash/cards";
    const userId = getUserId(req);

    try {
      const result = await getCards();
      
      if (result.error) {
        return sendApiError(res, {
          route,
          userId,
          provider: "clash-royale",
          status: result.status,
          error: {
            code: getClashErrorCode(result.status),
            message: result.error || "Failed to fetch cards",
          },
        });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching cards:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "clash-royale",
        status: 500,
        error: { code: "CLASH_CARDS_FETCH_FAILED", message: "Failed to fetch cards" },
      });
    }
  });

  // ============================================================================
  // PLAYER SYNC ROUTES
  // ============================================================================
  
  app.post('/api/player/sync', isAuthenticated, async (req: any, res) => {
    const route = "/api/player/sync";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const payload = parseRequestBody(playerSyncRequestSchema, req.body);
      if (!payload.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid player sync payload",
            details: payload.details,
          },
        });
      }

      const profile = await storage.getProfile(userId);
      const tagToSync = getCanonicalProfileTag(profile);

      if (!tagToSync) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "NO_CLASH_TAG",
            message: "No Clash Royale tag linked to your profile",
          },
        });
      }

      const syncErrors: SyncErrorItem[] = [];
      let syncStatus: "ok" | "partial" | "error" = "ok";
      let battles: any[] = [];
      let pushSessions: PushSession[] = [];
      let stats = computeBattleStats([]);
      let goals: any[] = [];
      let lastSyncedAt = (await storage.getSyncState(userId))?.lastSyncedAt || null;

      const playerResult = await getPlayerByTag(tagToSync);
      if (playerResult.error || !playerResult.data) {
        syncStatus = "error";
        syncErrors.push({
          source: "player",
          code: isTemporaryProviderStatus(playerResult.status)
            ? "PLAYER_TEMPORARY_UNAVAILABLE"
            : "PLAYER_FETCH_FAILED",
          message: playerResult.error || "Failed to fetch player data",
          status: playerResult.status,
        });

        logApiContext(route, userId, "clash-royale", playerResult.status || 500, getResponseRequestId(res));

        return res.json({
          status: syncStatus,
          partial: false,
          syncedTag: tagToSync,
          player: null,
          battles,
          pushSessions,
          stats,
          goals,
          lastSyncedAt,
          errors: syncErrors,
        });
      }

      const player = playerResult.data as any;

      const battlesResult = await getPlayerBattles(tagToSync);
      if (battlesResult.error) {
        syncStatus = "partial";
        syncErrors.push({
          source: "battlelog",
          code: isTemporaryProviderStatus(battlesResult.status)
            ? "BATTLELOG_TEMPORARY_UNAVAILABLE"
            : "BATTLELOG_FETCH_FAILED",
          message: battlesResult.error,
          status: battlesResult.status,
        });
      } else {
        battles = (battlesResult.data as any[]) || [];
      }

      pushSessions = computePushSessions(battles);
      stats = computeBattleStats(battles);

      // Canonical rule: lastSyncedAt is updated whenever player core payload is fetched successfully,
      // even when battlelog fails/returns empty, because profile-level data is still fresh.
      const syncState = await storage.updateSyncState(userId);
      lastSyncedAt = syncState.lastSyncedAt || null;

      try {
        goals = await storage.getGoals(userId);

        for (const goal of goals) {
          const progress = computeGoalAutoProgress(goal, {
            playerTrophies: player.trophies || 0,
            winRate: stats.winRate || 0,
            streak: stats.streak,
          });

          if (progress?.shouldUpdate) {
            await storage.updateGoal(goal.id, {
              currentValue: progress.currentValue,
              completed: progress.completed,
              completedAt: progress.completed ? new Date() : undefined,
            });
          }
        }

        goals = await storage.getGoals(userId);
      } catch (goalError) {
        console.warn("Goal sync failed during player sync:", goalError);
        syncStatus = "partial";
        syncErrors.push({
          source: "goals",
          code: "GOAL_SYNC_PARTIAL_FAILURE",
          message: "Goals could not be fully synchronized",
        });
      }

      const responseStatus = syncStatus;
      logApiContext(route, userId, "clash-royale", 200, getResponseRequestId(res));

      res.json({
        status: responseStatus,
        partial: responseStatus !== "ok",
        syncedTag: player.tag || tagToSync,
        player: {
          tag: player.tag,
          name: player.name,
          trophies: player.trophies,
          arena: player.arena,
          expLevel: player.expLevel,
          clan: player.clan,
          currentDeck: player.currentDeck,
          bestTrophies: player.bestTrophies,
          wins: player.wins,
          losses: player.losses,
          battleCount: player.battleCount,
        },
        battles,
        pushSessions,
        stats,
        lastSyncedAt,
        goals,
        errors: syncErrors,
      });
    } catch (error) {
      console.error("Error syncing player data:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "PLAYER_SYNC_FAILED", message: "Failed to sync player data" },
      });
    }
  });

  app.get('/api/player/sync-state', isAuthenticated, async (req: any, res) => {
    const route = "/api/player/sync-state";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const syncState = await storage.getSyncState(userId);

      res.json({
        lastSyncedAt: syncState?.lastSyncedAt || null,
      });
    } catch (error) {
      console.error("Error fetching sync state:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "SYNC_STATE_FETCH_FAILED", message: "Failed to fetch sync state" },
      });
    }
  });

  // ============================================================================
  // STRIPE BILLING ROUTES
  // ============================================================================

  app.get('/api/stripe/config', async (req, res) => {
    const route = "/api/stripe/config";
    const userId = getUserId(req);

    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error fetching Stripe config:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "STRIPE_CONFIG_FETCH_FAILED", message: "Failed to fetch Stripe configuration" },
      });
    }
  });

  app.get('/api/stripe/products', async (req, res) => {
    const route = "/api/stripe/products";
    const userId = getUserId(req);

    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }
      const result = await db.execute(
        sql`SELECT * FROM stripe.products WHERE active = true`
      );
      res.json({ data: result.rows });
    } catch (error) {
      console.error("Error fetching products:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "STRIPE_PRODUCTS_FETCH_FAILED", message: "Failed to fetch products" },
      });
    }
  });

  app.get('/api/stripe/prices', async (req, res) => {
    const route = "/api/stripe/prices";
    const userId = getUserId(req);

    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }
      const result = await db.execute(
        sql`SELECT * FROM stripe.prices WHERE active = true`
      );
      res.json({ data: result.rows });
    } catch (error) {
      console.error("Error fetching prices:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "STRIPE_PRICES_FETCH_FAILED", message: "Failed to fetch prices" },
      });
    }
  });

  app.get('/api/stripe/products-with-prices', async (req, res) => {
    const route = "/api/stripe/products-with-prices";
    const userId = getUserId(req);

    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }
      const result = await db.execute(
        sql`
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.active as product_active,
            p.metadata as product_metadata,
            pr.id as price_id,
            pr.unit_amount,
            pr.currency,
            pr.recurring,
            pr.active as price_active
          FROM stripe.products p
          LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.active = true
          ORDER BY p.id, pr.unit_amount
        `
      );

      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching products with prices:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "STRIPE_PRODUCTS_WITH_PRICES_FETCH_FAILED", message: "Failed to fetch products" },
      });
    }
  });

  app.post('/api/stripe/checkout', isAuthenticated, async (req: any, res) => {
    const route = "/api/stripe/checkout";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }

      const { priceId } = req.body as { priceId?: string };

      if (!priceId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: { code: "PRICE_ID_REQUIRED", message: "Price ID is required" },
        });
      }

      if (priceId !== PRO_BRL_MONTHLY_PRICE_ID) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: {
            code: "INVALID_PRICE_ID",
            message: "Only PRO BRL monthly checkout is allowed",
          },
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
      }

      const customerId = await stripeService.getOrCreateCustomer(userId, user.email || "");

      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : process.env.APP_BASE_URL || "http://localhost:5000";
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/billing?success=true`,
        `${baseUrl}/billing?canceled=true`,
        userId,
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "CHECKOUT_SESSION_FAILED", message: "Failed to create checkout session" },
      });
    }
  });

  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    const route = "/api/stripe/portal";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }

      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeCustomerId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: { code: "NO_SUBSCRIPTION", message: "No subscription found" },
        });
      }

      const domains = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domains ? `https://${domains}` : (process.env.APP_BASE_URL || 'http://localhost:5000');
      const session = await stripeService.createCustomerPortalSession(
        subscription.stripeCustomerId,
        `${baseUrl}/billing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "PORTAL_SESSION_FAILED", message: "Failed to create customer portal session" },
      });
    }
  });

  app.get('/api/billing/invoices', isAuthenticated, async (req: any, res) => {
    const route = "/api/billing/invoices";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const subscription = await storage.getSubscription(userId);
      if (!subscription?.stripeCustomerId) {
        return res.json([]);
      }

      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.json([]);
      }

      const stripe = await getUncachableStripeClient();
      const invoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 20,
      });

      const response = invoices.data.map((invoice) => {
        const firstLine = invoice.lines?.data?.[0];
        const firstLinePeriod = firstLine?.period;
        return {
          id: invoice.id,
          status: invoice.status,
          amountPaid: invoice.amount_paid,
          amountDue: invoice.amount_due,
          currency: invoice.currency?.toUpperCase(),
          createdAt: new Date(invoice.created * 1000).toISOString(),
          periodStart: firstLinePeriod?.start
            ? new Date(firstLinePeriod.start * 1000).toISOString()
            : null,
          periodEnd: firstLinePeriod?.end
            ? new Date(firstLinePeriod.end * 1000).toISOString()
            : null,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
        };
      });

      return res.json(response);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "INVOICE_FETCH_FAILED", message: "Failed to fetch invoices" },
      });
    }
  });

  // ============================================================================
  // STRIPE WEBHOOK ROUTES (for subscription activation)
  // ============================================================================
  
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: any, res) => {
    const route = "/api/stripe/webhook";
    const userId = getUserId(req);

    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" },
        });
      }

      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: { code: "STRIPE_SIGNATURE_MISSING", message: "Missing stripe-signature" },
        });
      }

      if (!Buffer.isBuffer(req.body)) {
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: { code: "STRIPE_WEBHOOK_PAYLOAD_INVALID", message: "Invalid webhook payload" },
        });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured");
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 503,
          error: {
            code: "STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED",
            message: "Stripe webhook secret not configured",
          },
        });
      }

      const sig = Array.isArray(signature) ? signature[0] : signature;
      const stripeSecretKey = await getStripeSecretKey();
      const stripe = new Stripe(stripeSecretKey);

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (error) {
        console.error("Invalid Stripe webhook signature:", error);
        return sendApiError(res, {
          route,
          userId,
          provider: "stripe",
          status: 400,
          error: { code: "STRIPE_WEBHOOK_SIGNATURE_INVALID", message: "Invalid webhook signature" },
        });
      }

      console.log(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session?.metadata?.userId && session?.subscription) {
            const userId = session.metadata.userId;
            const subscription = await storage.getSubscription(userId);
            const stripeSubscriptionId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id;
            let stripeSubscription: Stripe.Subscription | null = null;
            try {
              stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            } catch (subscriptionFetchError) {
              console.warn("Failed to retrieve Stripe subscription on checkout completion:", subscriptionFetchError);
            }
            
            if (subscription) {
              await storage.updateSubscription(subscription.id, {
                stripeSubscriptionId,
                plan: 'pro',
                status: stripeSubscription?.status === "active" ? "active" : "inactive",
                currentPeriodEnd:
                  getStripeSubscriptionPeriodEnd(stripeSubscription) ??
                  subscription.currentPeriodEnd ??
                  null,
                cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
              });
              console.log(`PRO activated for user: ${userId}`);
              
              await createNotificationIfAllowed(userId, "billing", {
                title: 'Bem-vindo ao PRO!',
                description: 'Sua assinatura PRO foi ativada com sucesso. Aproveite todos os recursos premium!',
                type: 'success',
              });
            } else {
              await storage.createSubscription({
                userId,
                stripeCustomerId:
                  typeof session.customer === "string" ? session.customer : session.customer?.id,
                stripeSubscriptionId,
                plan: 'pro',
                status: stripeSubscription?.status === "active" ? "active" : "inactive",
                currentPeriodEnd: getStripeSubscriptionPeriodEnd(stripeSubscription),
                cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
              });
            }
          }
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscriptionData = event.data.object as Stripe.Subscription;
          if (subscriptionData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
            if (existing) {
              const status = subscriptionData.status === 'active' ? 'active' : 
                            subscriptionData.status === 'canceled' ? 'canceled' : 
                            subscriptionData.status;
              await storage.updateSubscription(existing.id, {
                status: status,
                plan: status === "active" ? "pro" : existing.plan,
                currentPeriodEnd:
                  getStripeSubscriptionPeriodEnd(subscriptionData) ??
                  existing.currentPeriodEnd ??
                  null,
                cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
              });
              console.log(`Subscription ${subscriptionData.id} updated to: ${status}`);
            }
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscriptionData = event.data.object as Stripe.Subscription;
          if (subscriptionData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                plan: 'free',
                status: 'canceled',
                currentPeriodEnd:
                  getStripeSubscriptionPeriodEnd(subscriptionData) ??
                  existing.currentPeriodEnd ??
                  null,
                cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
              });
              console.log(`Subscription ${subscriptionData.id} canceled`);
              
              await createNotificationIfAllowed(existing.userId, "billing", {
                title: 'Assinatura cancelada',
                description: 'Sua assinatura PRO foi cancelada. Você voltou para o plano gratuito.',
                type: 'warning',
              });
            }
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          };
          const subscriptionId =
            typeof invoice?.subscription === "string"
              ? invoice.subscription
              : invoice?.subscription?.id;
          const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;

          if (subscriptionId) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionId);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                plan: "pro",
                status: "active",
                currentPeriodEnd:
                  typeof periodEndUnix === "number"
                    ? new Date(periodEndUnix * 1000)
                    : existing.currentPeriodEnd ?? null,
              });
            }
          }
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          };
          const subscriptionId =
            typeof invoice?.subscription === "string"
              ? invoice.subscription
              : invoice?.subscription?.id;

          if (subscriptionId) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionId);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                status: 'past_due',
              });
              console.log(`Subscription ${subscriptionId} marked as past_due due to payment failure`);
              
              await createNotificationIfAllowed(existing.userId, "billing", {
                title: 'Falha no pagamento',
                description: 'O pagamento da sua assinatura PRO falhou. Por favor, atualize seu método de pagamento.',
                type: 'error',
              });
            }
          }
          break;
        }
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "stripe",
        status: 500,
        error: { code: "STRIPE_WEBHOOK_PROCESSING_FAILED", message: "Webhook processing failed" },
      });
    }
  });

  // ============================================================================
  // AI COACH ROUTES
  // ============================================================================
  
  app.post('/api/coach/chat', isAuthenticated, async (req: any, res) => {
    const route = "/api/coach/chat";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }
      
      const isPro = await storage.isPro(userId);
      
      if (!isPro) {
        const messagesToday = await storage.countCoachMessagesToday(userId);
        const limitState = evaluateFreeCoachLimit(messagesToday, FREE_DAILY_LIMIT);
        if (limitState.reached) {
          return sendApiError(res, {
            route,
            userId,
            provider: "internal",
            status: 403,
            error: {
              code: "FREE_COACH_DAILY_LIMIT_REACHED",
              message: "Daily message limit reached. Upgrade to PRO for unlimited coaching.",
              details: {
                limit: FREE_DAILY_LIMIT,
                used: messagesToday,
              },
            },
          });
        }
      }

      const parsed = parseRequestBody(coachChatInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid coach chat payload",
            details: parsed.details,
          },
        });
      }

      const { messages, playerTag, contextType } = parsed.data;

      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "NO_USER_MESSAGE",
            message: "At least one user message is required",
          },
        });
      }

      const lossPatterns = [
        /por\s*que\s*perd[ie]/i,
        /why\s*did\s*i\s*lose/i,
        /analise\s*(minha\s*)?((última|ultima)\s*)?derrot/i,
        /analise\s*o\s*que\s*fiz\s*de\s*errado/i,
        /o\s*que\s*fiz\s*de\s*errado/i,
        /erros?\s*(da|na)\s*(minha\s*)?(última|ultima)?\s*(batalha|derrota|partida)/i,
        /última\s*derrota/i,
        /analyze\s*(my\s*)?(last\s*)?loss/i,
        /what\s*went\s*wrong/i,
      ];
      
      const shouldInjectLastBattle = lossPatterns.some(p => p.test(lastUserMessage.content));

      let playerContext: any = {};
      let lastBattleContext: any = null;

      const userGoals = await storage.getGoals(userId);
      const activeGoals = userGoals.filter(g => !g.completed).slice(0, 3);

      try {
        if (playerTag) {
          const playerResult = await getPlayerByTag(playerTag);
          if (playerResult.data) {
            const player = playerResult.data as any;
            playerContext = {
              playerTag: player.tag,
              trophies: player.trophies,
              arena: player.arena?.name,
              currentDeck: player.currentDeck?.map((c: any) => c.name),
            };

            const battlesResult = await getPlayerBattles(playerTag);
            if (battlesResult.data) {
              const battles = battlesResult.data as any[];
              playerContext.recentBattles = battles.slice(0, 5);
              
              const tiltLevel = computeTiltLevel(battles);
              const stats = computeBattleStats(battles);
              playerContext.tiltStatus = {
                level: tiltLevel,
                recentWinRate: stats.winRate,
                currentStreak: stats.streak,
                consecutiveLosses: tiltLevel === 'high' ? stats.streak.type === 'loss' ? stats.streak.count : 0 : 0,
              };
              
              if (activeGoals.length > 0) {
                playerContext.activeGoals = activeGoals.map(g => ({
                  title: g.title,
                  type: g.type,
                  target: g.targetValue,
                  current: g.currentValue,
                  progress: Math.round(((g.currentValue || 0) / g.targetValue) * 100),
                }));
              }
              
              if (shouldInjectLastBattle) {
                const lastLoss = battles.find((b: any) => {
                  const teamCrowns = b.team?.[0]?.crowns || 0;
                  const opponentCrowns = b.opponent?.[0]?.crowns || 0;
                  return teamCrowns < opponentCrowns;
                });
                
                if (lastLoss) {
                  const playerTeam = lastLoss.team?.[0];
                  const opponent = lastLoss.opponent?.[0];
                  
                  lastBattleContext = {
                    result: 'loss',
                    gameMode: lastLoss.gameMode?.name || lastLoss.type || 'Unknown',
                    arena: lastLoss.arena?.name,
                    playerDeck: playerTeam?.cards?.map((c: any) => c.name) || [],
                    opponentDeck: opponent?.cards?.map((c: any) => c.name) || [],
                    playerCrowns: playerTeam?.crowns || 0,
                    opponentCrowns: opponent?.crowns || 0,
                    trophyChange: playerTeam?.trophyChange || 0,
                    elixirLeaked: playerTeam?.elixirLeaked || 0,
                    battleTime: lastLoss.battleTime,
                  };
                  playerContext.lastBattleAnalysis = lastBattleContext;
                }
              }
            }
          }
        } else {
          const profile = await storage.getProfile(userId);
          const profileTag = getCanonicalProfileTag(profile);
          if (profileTag) {
            const playerResult = await getPlayerByTag(profileTag);
            if (playerResult.data) {
              const player = playerResult.data as any;
              playerContext = {
                playerTag: player.tag,
                trophies: player.trophies,
                arena: player.arena?.name,
                currentDeck: player.currentDeck?.map((c: any) => c.name),
              };
              
              const battlesResult = await getPlayerBattles(profileTag);
              if (battlesResult.data) {
                const battles = battlesResult.data as any[];
                playerContext.recentBattles = battles.slice(0, 5);
                
                const tiltLevel = computeTiltLevel(battles);
                const stats = computeBattleStats(battles);
                playerContext.tiltStatus = {
                  level: tiltLevel,
                  recentWinRate: stats.winRate,
                  currentStreak: stats.streak,
                  consecutiveLosses: tiltLevel === 'high' ? stats.streak.type === 'loss' ? stats.streak.count : 0 : 0,
                };
                
                if (activeGoals.length > 0) {
                  playerContext.activeGoals = activeGoals.map(g => ({
                    title: g.title,
                    type: g.type,
                    target: g.targetValue,
                    current: g.currentValue,
                    progress: Math.round(((g.currentValue || 0) / g.targetValue) * 100),
                  }));
                }
                
                if (shouldInjectLastBattle) {
                  const lastLoss = battles.find((b: any) => {
                    const teamCrowns = b.team?.[0]?.crowns || 0;
                    const opponentCrowns = b.opponent?.[0]?.crowns || 0;
                    return teamCrowns < opponentCrowns;
                  });
                  
                  if (lastLoss) {
                    const playerTeam = lastLoss.team?.[0];
                    const opponent = lastLoss.opponent?.[0];
                    
                    lastBattleContext = {
                      result: 'loss',
                      gameMode: lastLoss.gameMode?.name || lastLoss.type || 'Unknown',
                      arena: lastLoss.arena?.name,
                      playerDeck: playerTeam?.cards?.map((c: any) => c.name) || [],
                      opponentDeck: opponent?.cards?.map((c: any) => c.name) || [],
                      playerCrowns: playerTeam?.crowns || 0,
                      opponentCrowns: opponent?.crowns || 0,
                      trophyChange: playerTeam?.trophyChange || 0,
                      elixirLeaked: playerTeam?.elixirLeaked || 0,
                      battleTime: lastLoss.battleTime,
                    };
                    playerContext.lastBattleAnalysis = lastBattleContext;
                  }
                }
              }
            }
          }
        }
      } catch (contextError) {
        console.warn("Failed to fetch player context, continuing without it:", contextError);
      }

      const aiResponse = await generateCoachResponse(messages, playerContext, {
        provider: "openai",
        route,
        userId,
        requestId: getResponseRequestId(res),
      });
      
      await storage.createCoachMessage({
        userId,
        role: 'user',
        content: lastUserMessage.content,
        contextType: contextType || null,
      });
      
      await storage.createCoachMessage({
        userId,
        role: 'assistant',
        content: aiResponse,
        contextType: contextType || null,
      });
      
      const remainingMessages = isPro
        ? null
        : evaluateFreeCoachLimit(await storage.countCoachMessagesToday(userId), FREE_DAILY_LIMIT).remaining;
      
      res.json({ 
        message: aiResponse,
        timestamp: new Date().toISOString(),
        remainingMessages,
      });
    } catch (error) {
      console.error("Error in coach chat:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "openai",
        status: 500,
        error: { code: "COACH_CHAT_FAILED", message: "Failed to generate coach response" },
      });
    }
  });

  // ============================================================================
  // PUSH ANALYSIS ROUTE (PRO-only)
  // ============================================================================
  
  app.post('/api/coach/push-analysis', isAuthenticated, async (req: any, res) => {
    const route = "/api/coach/push-analysis";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const isPro = await storage.isPro(userId);
      if (!isPro) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 403,
          error: {
            code: "PRO_REQUIRED",
            message: "Análise de push é uma funcionalidade PRO. Atualize seu plano para ter acesso.",
          },
        });
      }

      const { playerTag: providedTag } = req.body as { playerTag?: string };

      let playerTag = providedTag;
      if (!playerTag) {
        const profile = await storage.getProfile(userId);
        const profileTag = getCanonicalProfileTag(profile);
        if (!profileTag) {
          return sendApiError(res, {
            route,
            userId,
            provider: "internal",
            status: 400,
            error: {
              code: "NO_PLAYER_TAG",
              message: "Nenhum jogador vinculado. Vincule sua conta Clash Royale primeiro.",
            },
          });
        }
        playerTag = profileTag;
      }

      const battlesResult = await getPlayerBattles(playerTag);
      if (!battlesResult.data) {
        return sendApiError(res, {
          route,
          userId,
          provider: "clash-royale",
          status: 404,
          error: {
            code: "BATTLES_FETCH_FAILED",
            message: "Não foi possível buscar as batalhas do jogador.",
          },
        });
      }

      const battles = battlesResult.data as any[];
      const pushSessions = computePushSessions(battles);

      if (pushSessions.length === 0) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "NO_PUSH_SESSION",
            message: "Nenhuma sessão de push encontrada. Você precisa de pelo menos 2 batalhas com intervalos de até 30 minutos.",
          },
        });
      }

      const latestPush = pushSessions[0];

      const battleContexts: BattleContext[] = latestPush.battles.map((battle: any) => {
        const playerTeam = battle.team?.[0];
        const opponent = battle.opponent?.[0];
        const playerCrowns = playerTeam?.crowns || 0;
        const opponentCrowns = opponent?.crowns || 0;

        let result: "win" | "loss" | "draw" = "draw";
        if (playerCrowns > opponentCrowns) result = "win";
        else if (playerCrowns < opponentCrowns) result = "loss";

        return {
          gameMode: getBattleModeName(battle),
          playerDeck: playerTeam?.cards?.map((c: any) => c.name) || [],
          opponentDeck: opponent?.cards?.map((c: any) => c.name) || [],
          playerCrowns,
          opponentCrowns,
          trophyChange: playerTeam?.trophyChange || 0,
          elixirLeaked: playerTeam?.elixirLeaked || 0,
          result,
        };
      });

      const durationMs = latestPush.endTime.getTime() - latestPush.startTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      const tiltLevel = computeTiltLevel(latestPush.battles);
      const consecutiveLosses = computeConsecutiveLosses(latestPush.battles);
      const avgTrophyChange =
        latestPush.battles.length > 0
          ? latestPush.netTrophies / latestPush.battles.length
          : 0;
      const avgElixirLeaked =
        latestPush.battles.length > 0
          ? latestPush.battles.reduce((acc, battle) => acc + (battle?.team?.[0]?.elixirLeaked || 0), 0) /
            latestPush.battles.length
          : 0;
      const modeBreakdown = buildPushModeBreakdown(latestPush.battles);

      const pushSessionContext: PushSessionContext = {
        wins: latestPush.wins,
        losses: latestPush.losses,
        winRate: latestPush.winRate,
        netTrophies: latestPush.netTrophies,
        durationMinutes,
        tiltLevel,
        consecutiveLosses,
        avgTrophyChange,
        avgElixirLeaked,
        modeBreakdown,
        battles: battleContexts,
      };

      const analysisResult = await generatePushAnalysis(pushSessionContext, {
        provider: "openai",
        route,
        userId,
        requestId: getResponseRequestId(res),
      });

      const savedAnalysis = await storage.createPushAnalysis({
        userId,
        pushStartTime: latestPush.startTime,
        pushEndTime: latestPush.endTime,
        battlesCount: latestPush.battles.length,
        wins: latestPush.wins,
        losses: latestPush.losses,
        netTrophies: latestPush.netTrophies,
        resultJson: {
          ...analysisResult,
          tiltLevel,
          consecutiveLosses,
          avgTrophyChange,
          avgElixirLeaked,
          modeBreakdown,
          durationMinutes,
        },
      });

      res.json({
        id: savedAnalysis.id,
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        mistakes: analysisResult.mistakes,
        recommendations: analysisResult.recommendations,
        wins: latestPush.wins,
        losses: latestPush.losses,
        winRate: latestPush.winRate,
        netTrophies: latestPush.netTrophies,
        battlesCount: latestPush.battles.length,
        pushStartTime: latestPush.startTime.toISOString(),
        pushEndTime: latestPush.endTime.toISOString(),
        durationMinutes,
        tiltLevel,
        consecutiveLosses,
        avgTrophyChange,
        avgElixirLeaked,
      });
    } catch (error) {
      console.error("Error in push analysis:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "openai",
        status: 500,
        error: { code: "PUSH_ANALYSIS_FAILED", message: "Falha ao gerar análise de push" },
      });
    }
  });

  app.get('/api/coach/push-analysis/latest', isAuthenticated, async (req: any, res) => {
    const route = "/api/coach/push-analysis/latest";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const analysis = await storage.getLatestPushAnalysis(userId);
      if (!analysis) {
        return res.json(null);
      }

      const analysisJson = (analysis.resultJson || {}) as Record<string, any>;
      const summary = typeof analysisJson.summary === "string" ? analysisJson.summary : "Sem resumo";
      const strengths = Array.isArray(analysisJson.strengths) ? analysisJson.strengths : [];
      const mistakes = Array.isArray(analysisJson.mistakes) ? analysisJson.mistakes : [];
      const recommendations = Array.isArray(analysisJson.recommendations) ? analysisJson.recommendations : [];

      return res.json({
        id: analysis.id,
        summary,
        strengths,
        mistakes,
        recommendations,
        wins: analysis.wins,
        losses: analysis.losses,
        winRate: analysis.battlesCount > 0 ? (analysis.wins / analysis.battlesCount) * 100 : 0,
        netTrophies: analysis.netTrophies,
        battlesCount: analysis.battlesCount,
        pushStartTime: analysis.pushStartTime?.toISOString?.() || null,
        pushEndTime: analysis.pushEndTime?.toISOString?.() || null,
        durationMinutes: analysisJson.durationMinutes ?? Math.round(
          (new Date(analysis.pushEndTime).getTime() - new Date(analysis.pushStartTime).getTime()) / 60000,
        ),
        tiltLevel: analysisJson.tiltLevel ?? "none",
        consecutiveLosses: analysisJson.consecutiveLosses ?? 0,
        avgTrophyChange: analysisJson.avgTrophyChange ?? 0,
        avgElixirLeaked: analysisJson.avgElixirLeaked ?? 0,
      });
    } catch (error) {
      console.error("Error fetching latest push analysis:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "PUSH_ANALYSIS_FETCH_FAILED", message: "Falha ao buscar análise de push" },
      });
    }
  });

  // ============================================================================
  // TRAINING CENTER ROUTES
  // ============================================================================

  app.get('/api/training/plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plan = await storage.getActivePlan(userId);
      
      if (!plan) {
        return res.json(null);
      }
      
      const drills = await storage.getDrillsByPlan(plan.id);
      
      res.json({
        ...plan,
        drills,
      });
    } catch (error) {
      console.error("Error fetching training plan:", error);
      res.status(500).json({ error: "Falha ao buscar plano de treinamento" });
    }
  });

  app.get('/api/training/plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plans = await storage.getTrainingPlans(userId);
      
      const plansWithDrills = await Promise.all(
        plans.map(async (plan) => ({
          ...plan,
          drills: await storage.getDrillsByPlan(plan.id),
        }))
      );
      
      res.json(plansWithDrills);
    } catch (error) {
      console.error("Error fetching training plans:", error);
      res.status(500).json({ error: "Falha ao buscar planos de treinamento" });
    }
  });

  app.post('/api/training/plan/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const isPro = await storage.isPro(userId);
      if (!isPro) {
        return res.status(403).json({ 
          error: "Geração de planos de treinamento é uma funcionalidade PRO.",
          code: "PRO_REQUIRED",
        });
      }
      
      const { pushAnalysisId } = req.body as { pushAnalysisId?: string };
      
      let analysisResult;
      
      if (pushAnalysisId) {
        const analysis = await storage.getPushAnalysis(pushAnalysisId);
        if (!analysis) {
          return res.status(404).json({ error: "Análise de push não encontrada" });
        }
        analysisResult = analysis.resultJson;
      } else {
        const latestAnalysis = await storage.getLatestPushAnalysis(userId);
        if (!latestAnalysis) {
          return res.status(400).json({ 
            error: "Nenhuma análise de push encontrada. Execute uma análise de push primeiro.",
            code: "NO_PUSH_ANALYSIS",
          });
        }
        analysisResult = latestAnalysis.resultJson;
      }
      
      const profile = await storage.getProfile(userId);
      let playerContext;
      
      const profileTag = getCanonicalProfileTag(profile);
      if (profileTag) {
        const playerResult = await getPlayerByTag(profileTag);
        if (playerResult.data) {
          const player = playerResult.data as any;
          playerContext = {
            trophies: player.trophies,
            arena: player.arena?.name,
            currentDeck: player.currentDeck?.map((c: any) => c.name),
          };
        }
      }
      
      const generatedPlan = await generateTrainingPlan(analysisResult as any, playerContext, {
        provider: "openai",
        route: "/api/training/plan/generate",
        userId,
        requestId: getResponseRequestId(res),
      });
      
      await storage.archiveOldPlans(userId);
      
      const plan = await storage.createTrainingPlan({
        userId,
        title: generatedPlan.title,
        source: 'push_analysis',
        status: 'active',
        pushAnalysisId: pushAnalysisId || undefined,
      });
      
      const drills = await Promise.all(
        generatedPlan.drills.map((drill) =>
          storage.createTrainingDrill({
            planId: plan.id,
            focusArea: drill.focusArea,
            description: drill.description,
            targetGames: drill.targetGames,
            completedGames: 0,
            mode: drill.mode,
            priority: drill.priority,
            status: 'pending',
          })
        )
      );
      
      await createNotificationIfAllowed(userId, "training", {
        title: 'Novo plano de treinamento criado!',
        description: `"${generatedPlan.title}" está pronto com ${drills.length} exercícios para você praticar.`,
        type: 'success',
      });
      
      res.json({
        ...plan,
        drills,
      });
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Falha ao gerar plano de treinamento" });
    }
  });

  app.patch('/api/training/drill/:drillId', isAuthenticated, async (req: any, res) => {
    const route = "/api/training/drill/:drillId";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(trainingDrillUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid training drill update payload",
            details: parsed.details,
          },
        });
      }

      const { drillId } = req.params;
      const { completedGames, status } = parsed.data;

      const existingDrill = await storage.getTrainingDrill(drillId);
      if (!existingDrill) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "DRILL_NOT_FOUND", message: "Drill não encontrado" },
        });
      }

      const parentPlan = await storage.getTrainingPlan(existingDrill.planId);
      if (!parentPlan || parentPlan.userId !== userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "DRILL_NOT_FOUND", message: "Drill não encontrado" },
        });
      }
      
      const updateData: any = {};
      if (completedGames !== undefined) updateData.completedGames = completedGames;
      if (status) updateData.status = status;
      
      const drill = await storage.updateTrainingDrill(drillId, updateData);
      
      if (!drill) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "DRILL_NOT_FOUND", message: "Drill não encontrado" },
        });
      }
      
      res.json(drill);
    } catch (error) {
      console.error("Error updating drill:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "DRILL_UPDATE_FAILED", message: "Falha ao atualizar drill" },
      });
    }
  });

  app.patch('/api/training/plan/:planId', isAuthenticated, async (req: any, res) => {
    const route = "/api/training/plan/:planId";
    const userId = getUserId(req);

    try {
      if (!userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "replit-oidc",
          status: 401,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }

      const parsed = parseRequestBody(trainingPlanUpdateInputSchema, req.body);
      if (!parsed.ok) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid training plan update payload",
            details: parsed.details,
          },
        });
      }

      const { planId } = req.params;
      const { status } = parsed.data;

      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan || existingPlan.userId !== userId) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "TRAINING_PLAN_NOT_FOUND", message: "Plano não encontrado" },
        });
      }
      
      const plan = await storage.updateTrainingPlan(planId, { status });
      
      if (!plan) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 404,
          error: { code: "TRAINING_PLAN_NOT_FOUND", message: "Plano não encontrado" },
        });
      }

      if (existingPlan.status !== "completed" && status === "completed") {
        await createNotificationIfAllowed(userId, "training", {
          title: "Plano concluído!",
          description: `Você concluiu o plano "${existingPlan.title}". Parabéns pela consistência.`,
          type: "success",
        });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error updating training plan:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "TRAINING_PLAN_UPDATE_FAILED", message: "Falha ao atualizar plano de treinamento" },
      });
    }
  });

  // ============================================================================
  // COMMUNITY RANKINGS ROUTES
  // ============================================================================

  app.get('/api/community/player-rankings', async (req, res) => {
    try {
      const locationId = (req.query.locationId as string) || 'global';
      const result = await getPlayerRankings(locationId);
      
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error fetching player rankings:", error);
      res.status(500).json({ error: "Failed to fetch player rankings" });
    }
  });

  app.get('/api/community/clan-rankings', async (req, res) => {
    try {
      const locationId = (req.query.locationId as string) || 'global';
      const result = await getClanRankings(locationId);
      
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error fetching clan rankings:", error);
      res.status(500).json({ error: "Failed to fetch clan rankings" });
    }
  });

  // ============================================================================
  // PUBLIC PLAYER AND CLAN ROUTES
  // ============================================================================

  app.get('/api/public/player/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      const playerResult = await getPlayerByTag(tag);
      
      if (playerResult.error) {
        return res.status(playerResult.status).json({ error: playerResult.error });
      }
      
      const battlesResult = await getPlayerBattles(tag);
      if (battlesResult.error) {
        return res.status(battlesResult.status).json({ error: battlesResult.error });
      }

      const battles = battlesResult.data || [];
      
      res.json({
        player: playerResult.data,
        recentBattles: (battles as any[]).slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching public player:", error);
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });

  app.get('/api/public/clan/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      const clanResult = await getClanByTag(tag);
      
      if (clanResult.error) {
        return res.status(clanResult.status).json({ error: clanResult.error });
      }

      let members: any[] = [];
      let membersError: string | null = null;
      const membersResult = await getClanMembers(tag);
      if (membersResult.error) {
        membersError = membersResult.error;
      } else {
        const items = (membersResult.data as any)?.items;
        members = Array.isArray(items) ? items : [];
      }

      res.json({
        clan: clanResult.data,
        members,
        membersPartial: Boolean(membersError),
        membersError,
      });
    } catch (error) {
      console.error("Error fetching clan:", error);
      res.status(500).json({ error: "Failed to fetch clan data" });
    }
  });

  // ============================================================================
  // META DECKS ROUTES
  // ============================================================================

  app.get('/api/meta/decks', async (req, res) => {
    try {
      const cachedDecks = await storage.getMetaDecks();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const toDeckResponse = (decks: any[], staleReason: "fresh" | "stale" = "fresh") =>
        decks.map((deck) => {
          const avgTrophies = typeof deck.avgTrophies === "number" ? deck.avgTrophies : null;
          const estimatedWinRate = avgTrophies === null
            ? 50
            : Math.max(45, Math.min(72, 45 + (avgTrophies - 6000) / 120));

          return {
            ...deck,
            sampleSize: deck.usageCount ?? 0,
            estimatedWinRate: Number(estimatedWinRate.toFixed(1)),
            cacheStatus: staleReason,
          };
        });
      
      const needsRefresh = cachedDecks.length === 0 || 
        cachedDecks.every(d => new Date(d.lastUpdatedAt || 0) < oneHourAgo);
      
      if (needsRefresh) {
        try {
          const topPlayersResult = await getTopPlayersInLocation('global', 50);
          if (topPlayersResult.data) {
            const items = (topPlayersResult.data as any).items || [];
            const deckMap = new Map<string, { cards: string[]; count: number; totalTrophies: number }>();
            
            for (const player of items) {
              if (player.currentDeck) {
                const cardNames = player.currentDeck.map((c: any) => c.name).sort();
                const deckHash = cardNames.join('|');
                
                if (deckMap.has(deckHash)) {
                  const existing = deckMap.get(deckHash)!;
                  existing.count++;
                  existing.totalTrophies += player.trophies || 0;
                } else {
                  deckMap.set(deckHash, {
                    cards: cardNames,
                    count: 1,
                    totalTrophies: player.trophies || 0,
                  });
                }
              }
            }
            
            const sortedDecks = Array.from(deckMap.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 20);
            
            await storage.clearMetaDecks();
            
            for (const [deckHash, data] of sortedDecks) {
              await storage.createMetaDeck({
                deckHash,
                cards: data.cards,
                usageCount: data.count,
                avgTrophies: Math.round(data.totalTrophies / data.count),
                archetype: detectArchetype(data.cards),
              });
            }
            
            const newDecks = await storage.getMetaDecks();
            return res.json(toDeckResponse(newDecks, "fresh"));
          }
        } catch (refreshError) {
          console.error("Error refreshing meta decks:", refreshError);
          if (cachedDecks.length > 0) {
            return res.json(toDeckResponse(cachedDecks, "stale"));
          }
          return res.json([]);
        }
      }
      
      res.json(toDeckResponse(cachedDecks, "fresh"));
    } catch (error) {
      console.error("Error fetching meta decks:", error);
      res.json([]);
    }
  });

  return httpServer;
}

function detectArchetype(cards: string[]): string {
  const cardSet = new Set(cards.map(c => c.toLowerCase()));
  
  if (cardSet.has('golem')) return 'Golem Beatdown';
  if (cardSet.has('lava hound')) return 'LavaLoon';
  if (cardSet.has('giant skeleton')) return 'Giant Skeleton';
  if (cardSet.has('x-bow')) return 'X-Bow Cycle';
  if (cardSet.has('mortar')) return 'Mortar Cycle';
  if (cardSet.has('hog rider')) return 'Hog Cycle';
  if (cardSet.has('royal giant')) return 'Royal Giant';
  if (cardSet.has('giant')) return 'Giant Beatdown';
  if (cardSet.has('p.e.k.k.a')) return 'P.E.K.K.A Bridge Spam';
  if (cardSet.has('elixir golem')) return 'Elixir Golem';
  if (cardSet.has('three musketeers')) return '3M Split';
  if (cardSet.has('graveyard')) return 'Graveyard Control';
  if (cardSet.has('mega knight')) return 'Mega Knight';
  if (cardSet.has('royal hogs')) return 'Royal Hogs';
  if (cardSet.has('miner') && cardSet.has('wall breakers')) return 'Miner WallBreakers';
  if (cardSet.has('balloon')) return 'Balloon Cycle';
  if (cardSet.has('goblin barrel')) return 'Log Bait';
  if (cardSet.has('sparky')) return 'Sparky';
  
  return 'Custom';
}
