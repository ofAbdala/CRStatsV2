/**
 * Public Clash Royale API proxy routes (no auth required)
 * Endpoints:
 *   GET /api/clash/player/:tag, GET /api/clash/player/:tag/battles, GET /api/clash/cards,
 *   GET /api/public/player/:tag, GET /api/public/clan/:tag
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getPlayerByTag, getPlayerBattles, getCards, getClanByTag, getClanMembers } from "../clashRoyaleApi";
import { getUserId, sendApiError, getClashErrorCode } from "./utils";

const router = Router();

// Per-route rate limiter for public Clash API proxy endpoints (TD-005 Phase 2)
// 30 requests per minute per IP
const publicProxyLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || "unknown",
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded for public API. Please wait before making more requests." },
});

// GET /api/clash/player/:tag
router.get('/api/clash/player/:tag', publicProxyLimiter, async (req: any, res) => {
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

// GET /api/clash/player/:tag/battles
router.get('/api/clash/player/:tag/battles', publicProxyLimiter, async (req: any, res) => {
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

// GET /api/clash/cards
router.get('/api/clash/cards', publicProxyLimiter, async (req: any, res) => {
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

// GET /api/public/player/:tag
router.get('/api/public/player/:tag', publicProxyLimiter, async (req, res) => {
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

// GET /api/public/clan/:tag
router.get('/api/public/clan/:tag', publicProxyLimiter, async (req, res) => {
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

export default router;
