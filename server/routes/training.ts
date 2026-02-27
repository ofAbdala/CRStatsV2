/**
 * Training center routes (plans, drills)
 * Endpoints:
 *   GET /api/training/plan, GET /api/training/plans,
 *   POST /api/training/plan/generate,
 *   PATCH /api/training/drill/:drillId, PATCH /api/training/plan/:planId
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { trainingDrillUpdateInputSchema, trainingPlanUpdateInputSchema } from "@shared/schema";
import { getPlayerByTag } from "../clashRoyaleApi";
import { generateTrainingPlan } from "../openai";
import {
  getUserId,
  sendApiError,
  parseRequestBody,
  getCanonicalProfileTag,
  getResponseRequestId,
  createNotificationIfAllowed,
} from "./utils";

const router = Router();

// GET /api/training/plan
router.get('/api/training/plan', requireAuth, async (req: any, res) => {
  const route = "/api/training/plan";
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
    const isPro = await storage.isPro(userId);
    if (!isPro) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 403,
        error: {
          code: "PRO_REQUIRED",
          message: "Treinos personalizados são uma funcionalidade PRO.",
        },
      });
    }
    const plan = await storage.getActivePlan(userId);

    if (!plan) {
      return res.json(null);
    }

    const drills = await storage.getDrillsByPlan(plan.id);

    return res.json({
      ...plan,
      drills,
    });
  } catch (error) {
    console.error("Error fetching training plan:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "TRAINING_PLAN_FETCH_FAILED", message: "Falha ao buscar plano de treinamento" },
    });
  }
});

// GET /api/training/plans
router.get('/api/training/plans', requireAuth, async (req: any, res) => {
  const route = "/api/training/plans";
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
    const isPro = await storage.isPro(userId);
    if (!isPro) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 403,
        error: {
          code: "PRO_REQUIRED",
          message: "Treinos personalizados são uma funcionalidade PRO.",
        },
      });
    }
    const plans = await storage.getTrainingPlans(userId);

    const plansWithDrills = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        drills: await storage.getDrillsByPlan(plan.id),
      })),
    );

    return res.json(plansWithDrills);
  } catch (error) {
    console.error("Error fetching training plans:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "TRAINING_PLANS_FETCH_FAILED", message: "Falha ao buscar planos de treinamento" },
    });
  }
});

// POST /api/training/plan/generate
router.post('/api/training/plan/generate', requireAuth, async (req: any, res) => {
  const route = "/api/training/plan/generate";
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

    const isPro = await storage.isPro(userId);
    if (!isPro) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 403,
        error: {
          code: "PRO_REQUIRED",
          message: "Geração de planos de treinamento é uma funcionalidade PRO.",
        },
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

    await createNotificationIfAllowed(storage, userId, "training", {
      title: 'Novo plano de treinamento criado!',
      description: `"${generatedPlan.title}" está pronto com ${drills.length} exercícios para você praticar.`,
      type: 'success',
    });

    return res.json({
      ...plan,
      drills,
    });
  } catch (error) {
    console.error("Error generating training plan:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "TRAINING_PLAN_GENERATE_FAILED", message: "Falha ao gerar plano de treinamento" },
    });
  }
});

// PATCH /api/training/drill/:drillId
router.patch('/api/training/drill/:drillId', requireAuth, async (req: any, res) => {
  const route = "/api/training/drill/:drillId";
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
    const isPro = await storage.isPro(userId);
    if (!isPro) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 403,
        error: {
          code: "PRO_REQUIRED",
          message: "Treinos personalizados são uma funcionalidade PRO.",
        },
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

// PATCH /api/training/plan/:planId
router.patch('/api/training/plan/:planId', requireAuth, async (req: any, res) => {
  const route = "/api/training/plan/:planId";
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
    const isPro = await storage.isPro(userId);
    if (!isPro) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 403,
        error: {
          code: "PRO_REQUIRED",
          message: "Treinos personalizados são uma funcionalidade PRO.",
        },
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
      await createNotificationIfAllowed(storage, userId, "training", {
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

export default router;
