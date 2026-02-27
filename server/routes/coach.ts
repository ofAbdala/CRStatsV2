/**
 * AI Coach routes (chat, push analysis)
 * Endpoints:
 *   POST /api/coach/chat, GET /api/coach/messages,
 *   POST /api/coach/push-analysis, GET /api/coach/push-analysis/latest
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { coachChatInputSchema } from "@shared/schema";
import { getPlayerBattles } from "../clashRoyaleApi";
import { generateCoachResponse, generatePushAnalysis, type BattleContext, type PushSessionContext } from "../openai";
import {
  computeConsecutiveLosses,
  computePushSessions,
  computeTiltLevel,
  evaluateFreeCoachLimit,
} from "../domain/syncRules";
import {
  FREE_DAILY_LIMIT,
  getUserId,
  sendApiError,
  parseRequestBody,
  getCanonicalProfileTag,
  getResponseRequestId,
  getBattleModeName,
  buildPushModeBreakdown,
} from "./utils";
import { gatherPlayerContext } from "./coachContext";

const router = Router();

// Per-route rate limiter for AI coach endpoints (TD-005 Phase 2)
// 10 requests per minute per authenticated user
const aiCoachLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.auth?.userId || req.ip,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded for AI coach endpoints. Please wait before sending more requests." },
});

// POST /api/coach/chat
router.post('/api/coach/chat', requireAuth, aiCoachLimiter, async (req: any, res) => {
  const route = "/api/coach/chat";
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

    try {
      const contextResult = await gatherPlayerContext(storage, userId, playerTag, {
        shouldInjectLastBattle,
      });
      playerContext = contextResult.playerContext;
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

// GET /api/coach/messages
router.get('/api/coach/messages', requireAuth, async (req: any, res) => {
  const route = "/api/coach/messages";
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
    const limitRaw = req.query.limit;
    const parsedLimit = typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) ? Math.min(200, Math.max(1, parsedLimit)) : 50;

    const messages = await storage.getCoachMessages(userId, limit);
    const chronological = messages.slice().reverse();

    return res.json(
      chronological.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt?.toISOString?.() || null,
      })),
    );
  } catch (error) {
    console.error("Error fetching coach messages:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "COACH_MESSAGES_FETCH_FAILED", message: "Failed to fetch coach messages" },
    });
  }
});

// POST /api/coach/push-analysis
router.post('/api/coach/push-analysis', requireAuth, async (req: any, res) => {
  const route = "/api/coach/push-analysis";
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

// GET /api/coach/push-analysis/latest
router.get('/api/coach/push-analysis/latest', requireAuth, async (req: any, res) => {
  const route = "/api/coach/push-analysis/latest";
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
          message: "Este recurso requer plano PRO.",
        },
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

export default router;
