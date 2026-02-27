/**
 * Goals routes
 * Endpoints: GET /api/goals, POST /api/goals, PATCH /api/goals/:id, DELETE /api/goals/:id
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { goalCreateInputSchema, goalUpdateInputSchema } from "@shared/schema";
import { getUserId, sendApiError, parseRequestBody } from "./utils";

const router = Router();

// GET /api/goals
router.get('/api/goals', requireAuth, async (req: any, res) => {
  const route = "/api/goals";
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
    const goals = await storage.getGoals(userId);
    return res.json(goals);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "GOALS_FETCH_FAILED", message: "Failed to fetch goals" },
    });
  }
});

// POST /api/goals
router.post('/api/goals', requireAuth, async (req: any, res) => {
  const route = "/api/goals";
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

// PATCH /api/goals/:id
router.patch('/api/goals/:id', requireAuth, async (req: any, res) => {
  const route = "/api/goals/:id";
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

// DELETE /api/goals/:id
router.delete('/api/goals/:id', requireAuth, async (req: any, res) => {
  const route = "/api/goals/:id";
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

    await storage.deleteGoal(id);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "GOAL_DELETE_FAILED", message: "Failed to delete goal" },
    });
  }
});

export default router;
