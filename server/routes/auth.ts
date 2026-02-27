/**
 * Auth & Profile routes
 * Endpoints: GET /api/auth/user, GET /api/profile, POST /api/profile, PATCH /api/profile, GET /api/subscription
 */
import { Router } from "express";
import { getUserStorage, serviceStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import {
  profileCreateInputSchema,
  profileUpdateInputSchema,
} from "@shared/schema";
import {
  getUserId,
  sendApiError,
  parseRequestBody,
  normalizeTag,
  getCanonicalProfileTag,
} from "./utils";

const router = Router();

// GET /api/auth/user
router.get('/api/auth/user', requireAuth, async (req: any, res) => {
  const route = "/api/auth/user";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    let user = await storage.getUser(userId);

    // Normally created by the Supabase `auth.users` trigger, but keep a server-side fallback
    // to avoid blocking the first request if the trigger isn't installed yet.
    if (!user) {
      const email = typeof req.auth?.claims?.email === "string" ? req.auth.claims.email : undefined;
      await serviceStorage.upsertUser({ id: userId, email });
      user = await storage.getUser(userId);
    }

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

// GET /api/profile
router.get('/api/profile', requireAuth, async (req: any, res) => {
  const route = "/api/profile";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
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

// POST /api/profile
router.post('/api/profile', requireAuth, async (req: any, res) => {
  const route = "/api/profile";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
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

// PATCH /api/profile
router.patch('/api/profile', requireAuth, async (req: any, res) => {
  const route = "/api/profile";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
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

// GET /api/subscription
router.get('/api/subscription', requireAuth, async (req: any, res) => {
  const route = "/api/subscription";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    await storage.bootstrapUserData(userId);
    const subscription = await storage.getSubscription(userId);

    return res.json(subscription || { plan: "free", status: "inactive" });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "SUBSCRIPTION_FETCH_FAILED", message: "Failed to fetch subscription" },
    });
  }
});

export default router;
