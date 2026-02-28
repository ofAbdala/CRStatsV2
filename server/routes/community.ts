/**
 * Community routes — rankings, follow system, deck sharing, top decks, deck voting.
 * Story 2.7: Community & Social Features
 *
 * Endpoints:
 *   GET  /api/community/player-rankings     — Player leaderboard
 *   GET  /api/community/clan-rankings       — Clan leaderboard
 *   GET  /api/community/top-decks           — Top community decks (AC10)
 *   GET  /api/clan/:tag                     — Clan info + members (AC1, AC2, AC3)
 *   POST /api/follow/:userId               — Follow a user (AC4)
 *   DELETE /api/follow/:userId             — Unfollow a user (AC4)
 *   GET  /api/follow/following              — List who current user follows (AC5)
 *   GET  /api/follow/status/:userId         — Check if following (AC4)
 *   GET  /api/deck/share/:encodedDeck       — Deck share data (AC7, AC8)
 *   POST /api/deck/vote/:deckHash           — Upvote deck with battle proof (AC11)
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getPlayerRankings, getClanRankings, getClanByTag, getClanMembers, getClanWarLog } from "../clashRoyaleApi";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { getUserId, sendApiError } from "./utils";
import { getTierLimits, isUnlimited } from "../../shared/constants/limits";
import { decodeDeck, isValidEncodedDeck } from "../domain/deckShare";

const router = Router();

// ── Rate limiters ────────────────────────────────────────────────────────────

const followLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).auth?.userId || req.ip || "unknown",
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Too many follow actions. Please wait before trying again." },
});

// ── Clan data cache (1h TTL) ─────────────────────────────────────────────────

interface ClanCacheEntry {
  data: unknown;
  expiresAt: number;
}

const clanCache = new Map<string, ClanCacheEntry>();
const CLAN_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getClanFromCache(tag: string): unknown | null {
  const entry = clanCache.get(tag);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    clanCache.delete(tag);
    return null;
  }
  return entry.data;
}

function setClanCache(tag: string, data: unknown): void {
  clanCache.set(tag, { data, expiresAt: Date.now() + CLAN_CACHE_TTL_MS });
  // Evict stale entries on set (simple cleanup)
  if (clanCache.size > 200) {
    const now = Date.now();
    const keys = Array.from(clanCache.keys());
    for (let i = 0; i < keys.length; i++) {
      const entry = clanCache.get(keys[i]);
      if (entry && now > entry.expiresAt) clanCache.delete(keys[i]);
    }
  }
}

// ── GET /api/community/player-rankings ───────────────────────────────────────

router.get('/api/community/player-rankings', async (req, res) => {
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

// ── GET /api/community/clan-rankings ─────────────────────────────────────────

router.get('/api/community/clan-rankings', async (req, res) => {
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

// ── GET /api/clan/:tag — Clan stats page (AC1, AC2, AC3) ────────────────────

router.get('/api/clan/:tag', async (req, res) => {
  const route = "/api/clan/:tag";
  try {
    const { tag } = req.params;
    const normalizedTag = tag.replace(/^#/, "").toUpperCase();

    // Check cache first
    const cached = getClanFromCache(normalizedTag);
    if (cached) {
      return res.json(cached);
    }

    // Fetch clan info and members in parallel
    const [clanResult, membersResult, warLogResult] = await Promise.all([
      getClanByTag(normalizedTag),
      getClanMembers(normalizedTag),
      getClanWarLog(normalizedTag).catch(() => ({ data: null, error: "War log unavailable", status: 404 })),
    ]);

    if (clanResult.error) {
      return res.status(clanResult.status).json({ error: clanResult.error });
    }

    const clan = clanResult.data as any;
    const membersItems = membersResult.error
      ? []
      : Array.isArray((membersResult.data as any)?.items)
        ? (membersResult.data as any).items
        : [];

    // Sort members by trophies for "top members"
    const sortedMembers = [...membersItems].sort((a: any, b: any) => (b.trophies || 0) - (a.trophies || 0));

    const warLog = warLogResult.error
      ? []
      : Array.isArray((warLogResult.data as any)?.items)
        ? (warLogResult.data as any).items.slice(0, 10)
        : [];

    const responseData = {
      clan: {
        name: clan?.name,
        tag: clan?.tag,
        description: clan?.description,
        clanScore: clan?.clanScore,
        clanWarTrophies: clan?.clanWarTrophies,
        members: clan?.members,
        requiredTrophies: clan?.requiredTrophies,
        type: clan?.type,
        badgeId: clan?.badgeId,
      },
      memberList: sortedMembers.map((m: any) => ({
        name: m.name,
        tag: m.tag,
        role: m.role,
        trophies: m.trophies,
        lastSeen: m.lastSeen,
        arena: m.arena,
        expLevel: m.expLevel,
      })),
      topMembers: sortedMembers.slice(0, 10).map((m: any) => ({
        name: m.name,
        tag: m.tag,
        trophies: m.trophies,
        role: m.role,
      })),
      warLog,
    };

    setClanCache(normalizedTag, responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching clan data:", error);
    res.status(500).json({ error: "Failed to fetch clan data" });
  }
});

// ── POST /api/follow/:userId — Follow a user (AC4, AC6) ─────────────────────

router.post('/api/follow/:userId', requireAuth, followLimiter, async (req: any, res) => {
  const route = "/api/follow/:userId";
  const followerId = getUserId(req);

  if (!followerId) {
    return sendApiError(res, {
      route,
      userId: followerId,
      provider: "supabase-auth",
      status: 401,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
    });
  }

  const { userId: targetUserId } = req.params;
  if (!targetUserId || typeof targetUserId !== "string") {
    return sendApiError(res, {
      route,
      userId: followerId,
      provider: "internal",
      status: 400,
      error: { code: "VALIDATION_ERROR", message: "Invalid user ID" },
    });
  }

  if (followerId === targetUserId) {
    return sendApiError(res, {
      route,
      userId: followerId,
      provider: "internal",
      status: 400,
      error: { code: "CANNOT_FOLLOW_SELF", message: "You cannot follow yourself" },
    });
  }

  try {
    const storage = getUserStorage(req.auth!);
    const tier = await storage.getTier(followerId);
    const limits = getTierLimits(tier);

    if (!isUnlimited(limits.maxFollows)) {
      const currentCount = await storage.getFollowingCount(followerId);
      if (currentCount >= limits.maxFollows) {
        return sendApiError(res, {
          route,
          userId: followerId,
          provider: "internal",
          status: 403,
          error: {
            code: "FOLLOW_LIMIT_REACHED",
            message: `Free users can follow up to ${limits.maxFollows} players. Upgrade to PRO for unlimited follows.`,
            details: { limit: limits.maxFollows, current: currentCount },
          },
        });
      }
    }

    const follow = await storage.followUser(followerId, targetUserId);
    res.json({ success: true, follow });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// ── DELETE /api/follow/:userId — Unfollow a user (AC4) ───────────────────────

router.delete('/api/follow/:userId', requireAuth, followLimiter, async (req: any, res) => {
  const route = "/api/follow/:userId";
  const followerId = getUserId(req);

  if (!followerId) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const { userId: targetUserId } = req.params;

  try {
    const storage = getUserStorage(req.auth!);
    await storage.unfollowUser(followerId, targetUserId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

// ── GET /api/follow/following — List who current user follows (AC5) ──────────

router.get('/api/follow/following', requireAuth, async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  try {
    const storage = getUserStorage(req.auth!);
    const following = await storage.getFollowing(userId);
    const count = await storage.getFollowingCount(userId);
    res.json({ following, count });
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Failed to fetch following list" });
  }
});

// ── GET /api/follow/status/:userId — Check follow status (AC4) ──────────────

router.get('/api/follow/status/:userId', requireAuth, async (req: any, res) => {
  const followerId = getUserId(req);
  if (!followerId) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const { userId: targetUserId } = req.params;

  try {
    const storage = getUserStorage(req.auth!);
    const isFollowing = await storage.isFollowing(followerId, targetUserId);
    res.json({ isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ error: "Failed to check follow status" });
  }
});

// ── GET /api/deck/share/:encodedDeck — Deck share data (AC7, AC8) ───────────

router.get('/api/deck/share/:encodedDeck', async (req, res) => {
  try {
    const { encodedDeck } = req.params;

    if (!isValidEncodedDeck(encodedDeck)) {
      return res.status(400).json({ code: "INVALID_DECK", message: "Invalid deck encoding" });
    }

    const cards = decodeDeck(encodedDeck);
    if (!cards || cards.length !== 8) {
      return res.status(400).json({ code: "INVALID_DECK", message: "Deck must contain exactly 8 cards" });
    }

    const avgElixir = cards.reduce((sum, c) => sum + (c.elixirCost || 0), 0) / cards.length;

    // Build copy-to-game link
    const cardIds = cards.map((c) => c.id).filter(Boolean);
    const copyLink = cardIds.length === 8
      ? `https://link.clashroyale.com/deck/en?deck=${encodeURIComponent(cardIds.join(";"))}`
      : null;

    res.json({
      cards: cards.map((c) => ({ name: c.name, id: c.id, elixirCost: c.elixirCost })),
      avgElixir: Number(avgElixir.toFixed(1)),
      encodedDeck,
      copyLink,
    });
  } catch (error) {
    console.error("Error processing deck share:", error);
    res.status(500).json({ error: "Failed to process deck share" });
  }
});

// ── GET /api/community/top-decks — Top community decks (AC10) ────────────────

router.get('/api/community/top-decks', async (req: any, res) => {
  try {
    const arenaRaw = req.query?.arena;
    const arenaId = typeof arenaRaw === "string" ? Number.parseInt(arenaRaw, 10) : undefined;
    const period = (req.query?.period as string) || "week";

    // Query from arena_meta_decks if arena filter provided, else from meta_decks_cache
    const userId = getUserId(req);
    // This is a public endpoint — no auth required for reading top decks
    // Use service storage (no RLS context needed for read-only meta data)
    const { serviceStorage } = await import("../storage");

    let decks: any[];
    if (arenaId !== undefined && Number.isFinite(arenaId)) {
      decks = await serviceStorage.getArenaMetaDecks(arenaId, { limit: 20 });
    } else {
      decks = await serviceStorage.getMetaDecks({ limit: 20 });
    }

    // Also get top voted decks to merge vote data
    const topVoted = await serviceStorage.getTopVotedDecks({ limit: 50 });
    const voteMap = new Map(topVoted.map((v) => [v.deckHash, v.votes]));

    const result = decks.map((d: any, idx: number) => ({
      rank: idx + 1,
      deckHash: d.deckHash,
      cards: d.cards,
      winRate: d.winRate ?? d.winRateEstimate ?? 0,
      usageRate: d.usageRate ?? 0,
      threeCrownRate: d.threeCrownRate ?? 0,
      avgElixir: d.avgElixir ?? null,
      sampleSize: d.sampleSize ?? d.usageCount ?? 0,
      archetype: d.archetype ?? null,
      votes: voteMap.get(d.deckHash) || 0,
    }));

    res.json({
      arenaId: arenaId ?? null,
      period,
      decks: result,
    });
  } catch (error) {
    console.error("Error fetching top decks:", error);
    res.status(500).json({ error: "Failed to fetch top decks" });
  }
});

// ── POST /api/deck/vote/:deckHash — Upvote deck with battle proof (AC11) ────

router.post('/api/deck/vote/:deckHash', requireAuth, async (req: any, res) => {
  const route = "/api/deck/vote/:deckHash";
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const { deckHash } = req.params;
  const { battleId } = req.body || {};

  if (!deckHash || typeof deckHash !== "string") {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Invalid deck hash" });
  }

  if (!battleId || typeof battleId !== "string") {
    return res.status(400).json({
      code: "BATTLE_PROOF_REQUIRED",
      message: "A battleId is required to verify you won with this deck",
    });
  }

  try {
    const storage = getUserStorage(req.auth!);

    // Check if already voted
    const alreadyVoted = await storage.hasVotedDeck(userId, deckHash);
    if (alreadyVoted) {
      return res.status(409).json({ code: "ALREADY_VOTED", message: "You have already upvoted this deck" });
    }

    const vote = await storage.voteDeck(userId, deckHash, battleId);
    const voteCount = await storage.getDeckVoteCount(deckHash);

    res.json({ success: true, vote, totalVotes: voteCount });
  } catch (error) {
    console.error("Error voting for deck:", error);
    res.status(500).json({ error: "Failed to vote for deck" });
  }
});

export default router;
