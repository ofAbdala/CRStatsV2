/**
 * User settings routes
 * Endpoints: GET /api/settings, PATCH /api/settings
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { settingsUpdateInputSchema } from "@shared/schema";
import { getUserId, sendApiError, parseRequestBody } from "./utils";

const router = Router();

// GET /api/settings
router.get('/api/settings', requireAuth, async (req: any, res) => {
  const route = "/api/settings";
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
        training: prefs?.training ?? true,
        billing: prefs?.billing ?? true,
        system: prefs?.system ?? true,
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

// PATCH /api/settings
router.patch('/api/settings', requireAuth, async (req: any, res) => {
  const route = "/api/settings";
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

    const settingsPayload = {
      theme: parsed.data.theme,
      preferredLanguage: parsed.data.preferredLanguage,
      defaultLandingPage: parsed.data.defaultLandingPage,
      showAdvancedStats: parsed.data.showAdvancedStats,
      notificationsEnabled: parsed.data.notificationsEnabled,
    };

    let settings = await storage.updateUserSettings(userId, settingsPayload);

    const categoryPayload = parsed.data.notificationPreferences;
    const hasCategoryOverride =
      categoryPayload?.training !== undefined ||
      categoryPayload?.billing !== undefined ||
      categoryPayload?.system !== undefined;

    let prefs = await storage.getNotificationPreferences(userId);
    if (hasCategoryOverride && categoryPayload) {
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
        training: prefs?.training ?? true,
        billing: prefs?.billing ?? true,
        system: prefs?.system ?? true,
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

export default router;
