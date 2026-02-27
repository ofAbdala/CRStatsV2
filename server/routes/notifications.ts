/**
 * Notifications & notification preferences routes
 * Endpoints:
 *   GET /api/notifications, POST /api/notifications/:id/read,
 *   POST /api/notifications/read-all, DELETE /api/notifications,
 *   GET /api/notification-preferences, PATCH /api/notification-preferences
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { notificationPreferencesUpdateInputSchema } from "@shared/schema";
import { getUserId, sendApiError, parseRequestBody } from "./utils";

const router = Router();

// GET /api/notifications
router.get('/api/notifications', requireAuth, async (req: any, res) => {
  const route = "/api/notifications";
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

// POST /api/notifications/:id/read
router.post('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
  const route = "/api/notifications/:id/read";
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

// POST /api/notifications/read-all
router.post('/api/notifications/read-all', requireAuth, async (req: any, res) => {
  const route = "/api/notifications/read-all";
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

// DELETE /api/notifications
router.delete('/api/notifications', requireAuth, async (req: any, res) => {
  const route = "/api/notifications";
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

// GET /api/notification-preferences
router.get('/api/notification-preferences', requireAuth, async (req: any, res) => {
  const route = "/api/notification-preferences";
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
    const prefs = await storage.getNotificationPreferences(userId);

    res.json({
      training: prefs?.training ?? true,
      billing: prefs?.billing ?? true,
      system: prefs?.system ?? true,
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

// PATCH /api/notification-preferences
router.patch('/api/notification-preferences', requireAuth, async (req: any, res) => {
  const route = "/api/notification-preferences";
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

export default router;
