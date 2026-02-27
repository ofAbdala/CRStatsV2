/**
 * Deck builder routes (meta, counter, optimizer)
 * Endpoints:
 *   GET /api/decks/meta, GET /api/meta/decks (alias),
 *   POST /api/decks/builder/counter, POST /api/decks/optimizer
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { counterDeckRequestSchema, deckOptimizerRequestSchema } from "@shared/schema";
import { generateCounterDeckSuggestion, generateDeckOptimizationSuggestion } from "../openai";
import { COUNTER_MAP, buildClashDeckImportLink, computeAvgElixir, computeChanges, detectWinCondition, getCardIndex } from "../domain/decks";
import {
  FREE_DECK_SUGGESTION_DAILY_LIMIT,
  getUserId,
  sendApiError,
  parseRequestBody,
  getResponseRequestId,
} from "./utils";

const router = Router();

// Per-route rate limiter for AI deck builder endpoints (TD-005 Phase 2)
// 10 requests per minute per authenticated user
const aiDeckLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.auth?.userId || req.ip,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded for AI deck builder endpoints. Please wait before sending more requests." },
});

// ── Local helpers ──────────────────────────────────────────────────────────────

function normalizeDeckKey(value: string) {
  return value.trim().toLowerCase();
}

function isValidDeckCards(cards: unknown): cards is string[] {
  if (!Array.isArray(cards) || cards.length !== 8) return false;
  const seen = new Set<string>();
  for (const card of cards) {
    if (typeof card !== "string") return false;
    const key = normalizeDeckKey(card);
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function createMetaDecksHandler(route: string) {
  return async (req: any, res: any) => {
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

      const minTrophiesRaw = req.query?.minTrophies;
      const minTrophiesParsed = typeof minTrophiesRaw === "string" ? Number.parseInt(minTrophiesRaw, 10) : NaN;
      const minTrophies = Number.isFinite(minTrophiesParsed) ? Math.max(0, minTrophiesParsed) : undefined;

      const storage = getUserStorage(req.auth!);

      // TD-028: Read from cache only — refresh is now triggered by cron job
      const decks = await storage.getMetaDecks({ minTrophies, limit: 50 });

      const cardIndex = await getCardIndex().catch(() => null);

      // Determine cache freshness based on last update timestamp
      const lastUpdated = decks.length > 0 ? decks[0]?.lastUpdatedAt : null;
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const cacheStatus: "fresh" | "stale" = lastUpdated && lastUpdated > sixHoursAgo ? "fresh" : "stale";

      return res.json(
        decks.map((deck) => {
          const games = typeof deck.usageCount === "number" ? deck.usageCount : 0;
          const wins = typeof (deck as any).wins === "number" ? (deck as any).wins : 0;
          const losses = typeof (deck as any).losses === "number" ? (deck as any).losses : 0;
          const storedAvgElixir = typeof (deck as any).avgElixir === "number" ? (deck as any).avgElixir : null;
          const avgElixir = storedAvgElixir !== null ? storedAvgElixir : cardIndex ? computeAvgElixir(deck.cards, cardIndex) : 3.5;
          const storedWinRate = typeof (deck as any).winRateEstimate === "number" ? (deck as any).winRateEstimate : null;
          const winRateEstimate =
            storedWinRate !== null ? storedWinRate : games > 0 ? Number((((wins + 1) / (games + 2)) * 100).toFixed(2)) : 50;

          return {
            deckHash: deck.deckHash,
            cards: deck.cards,
            avgElixir,
            games,
            wins,
            losses,
            winRateEstimate,
            archetype: deck.archetype ?? null,
            lastUpdatedAt: deck.lastUpdatedAt?.toISOString?.() || new Date().toISOString(),
            cacheStatus,
          };
        }),
      );
    } catch (error) {
      console.error("Error fetching meta decks:", error);
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "META_DECKS_FETCH_FAILED", message: "Failed to fetch meta decks" },
      });
    }
  };
}

// ── Route definitions ──────────────────────────────────────────────────────────

// New endpoint
router.get("/api/decks/meta", requireAuth, createMetaDecksHandler("/api/decks/meta"));
// Backwards-compatible alias
router.get("/api/meta/decks", requireAuth, createMetaDecksHandler("/api/meta/decks"));

// POST /api/decks/builder/counter
router.post("/api/decks/builder/counter", requireAuth, aiDeckLimiter, async (req: any, res: any) => {
  const route = "/api/decks/builder/counter";
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

    const payload = parseRequestBody(counterDeckRequestSchema, req.body);
    if (!payload.ok) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid counter deck payload",
          details: payload.details,
        },
      });
    }

    if (!isPro) {
      const used = await storage.countDeckSuggestionsToday(userId, "counter");
      if (used >= FREE_DECK_SUGGESTION_DAILY_LIMIT) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 403,
          error: {
            code: "DECK_COUNTER_DAILY_LIMIT_REACHED",
            message: "Daily FREE counter deck limit reached. Upgrade to PRO for unlimited usage.",
            details: { limit: FREE_DECK_SUGGESTION_DAILY_LIMIT },
          },
        });
      }
    }

    const deckStyle = payload.data.deckStyle ?? "balanced";
    const targetCardKey = payload.data.targetCardKey;
    const trophyRange = payload.data.trophyRange ?? null;

    // TD-028: meta cache refresh is now cron-only — read from cache
    const metaDecks = await storage.getMetaDecks({
      minTrophies: trophyRange?.min ?? undefined,
      limit: 50,
    });
    const metaFiltered =
      trophyRange?.max != null
        ? metaDecks.filter((deck) => deck.avgTrophies === null || deck.avgTrophies === undefined || deck.avgTrophies <= trophyRange.max)
        : metaDecks;

    const settings = await storage.getUserSettings(userId);
    const language = settings?.preferredLanguage === "en" ? "en" : "pt";

    const cardIndex = await getCardIndex();

    const targetKey = normalizeDeckKey(targetCardKey);
    const counterCards = COUNTER_MAP[targetKey] ?? ["The Log", "Arrows", "Fireball", "Poison", "Tornado"];
    const counterKeys = new Set(counterCards.map((c) => normalizeDeckKey(c)));

    type Candidate = {
      cards: string[];
      avgElixir: number;
      winRateEstimate: number;
      games: number;
    };

    const candidates: Candidate[] = metaFiltered
      .map((deck) => {
        const games = typeof deck.usageCount === "number" ? deck.usageCount : 0;
        const wins = typeof (deck as any).wins === "number" ? (deck as any).wins : 0;
        const storedAvgElixir = typeof (deck as any).avgElixir === "number" ? (deck as any).avgElixir : null;
        const avgElixir = storedAvgElixir !== null ? storedAvgElixir : computeAvgElixir(deck.cards, cardIndex);
        const storedWinRate = typeof (deck as any).winRateEstimate === "number" ? (deck as any).winRateEstimate : null;
        const winRateEstimate =
          storedWinRate !== null
            ? storedWinRate
            : games > 0
              ? Number((((wins + 1) / (games + 2)) * 100).toFixed(2))
              : 50;
        return {
          cards: deck.cards,
          avgElixir,
          winRateEstimate,
          games,
        } satisfies Candidate;
      })
      .filter((deck) => deck.cards.length === 8);

    const styleTarget = deckStyle === "cycle" ? 3.15 : deckStyle === "heavy" ? 4.45 : 3.65;

    const scored = candidates
      .map((deck) => {
        const deckCardKeys = new Set(deck.cards.map((c) => normalizeDeckKey(c)));
        const counterHits = Array.from(counterKeys).filter((c) => deckCardKeys.has(c)).length;

        // If we have a specific counter mapping, require at least one hit.
        if ((COUNTER_MAP[targetKey]?.length ?? 0) > 0 && counterHits === 0) {
          return null;
        }

        const stylePenalty = Math.abs(deck.avgElixir - styleTarget) * 6;
        const sampleBonus = Math.log10(deck.games + 1) * 3;
        const counterBonus = counterHits * 4;
        const score = deck.winRateEstimate + sampleBonus + counterBonus - stylePenalty;

        return { deck, score };
      })
      .filter((value): value is { deck: Candidate; score: number } => value !== null)
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 10).map((s) => s.deck);
    const fallbackDeck = top[0] ?? candidates[0];

    const ai = await generateCounterDeckSuggestion(
      {
        targetCardKey,
        deckStyle,
        candidateDecks: top.map((d) => ({
          cards: d.cards,
          avgElixir: d.avgElixir,
          winRateEstimate: d.winRateEstimate,
          games: d.games,
        })),
        language,
      },
      { provider: "openai", route, userId, requestId: getResponseRequestId(res) },
    );

    let finalCards = ai.deck;
    const validAiDeck =
      isValidDeckCards(finalCards) &&
      finalCards.every((card) => cardIndex.byNameLower.has(normalizeDeckKey(card)));

    if (!validAiDeck && fallbackDeck) {
      finalCards = fallbackDeck.cards.slice(0, 8);
    }

    // Hard fallback if we still don't have a valid deck.
    if (!isValidDeckCards(finalCards)) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "DECK_COUNTER_FAILED", message: "Failed to generate a valid counter deck" },
      });
    }

    const avgElixir = computeAvgElixir(finalCards, cardIndex);
    const importLink = buildClashDeckImportLink(finalCards, cardIndex, language) ?? "";

    if (!isPro) {
      await storage.incrementDeckSuggestionUsage(userId, "counter");
    }

    return res.json({
      deck: { cards: finalCards, avgElixir },
      explanation: ai.explanation,
      importLink,
    });
  } catch (error) {
    console.error("Error generating counter deck:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "DECK_COUNTER_FAILED", message: "Failed to generate counter deck" },
    });
  }
});

// POST /api/decks/optimizer
router.post("/api/decks/optimizer", requireAuth, async (req: any, res: any) => {
  const route = "/api/decks/optimizer";
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

    const payload = parseRequestBody(deckOptimizerRequestSchema, req.body);
    if (!payload.ok) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid deck optimizer payload",
          details: payload.details,
        },
      });
    }

    if (!isPro) {
      const used = await storage.countDeckSuggestionsToday(userId, "optimizer");
      if (used >= FREE_DECK_SUGGESTION_DAILY_LIMIT) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 403,
          error: {
            code: "DECK_OPTIMIZER_DAILY_LIMIT_REACHED",
            message: "Daily FREE deck optimizer limit reached. Upgrade to PRO for unlimited usage.",
            details: { limit: FREE_DECK_SUGGESTION_DAILY_LIMIT },
          },
        });
      }
    }

    const { currentDeck, goal, targetCardKey } = payload.data;

    // TD-028: meta cache refresh is now cron-only — read from cache
    const settings = await storage.getUserSettings(userId);
    const language = settings?.preferredLanguage === "en" ? "en" : "pt";

    const cardIndex = await getCardIndex();

    if (!isValidDeckCards(currentDeck) || !currentDeck.every((card) => cardIndex.byNameLower.has(normalizeDeckKey(card)))) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: { code: "INVALID_DECK", message: "currentDeck must be 8 unique valid card names" },
      });
    }

    const avgElixirBefore = computeAvgElixir(currentDeck, cardIndex);
    const winCondition = detectWinCondition(currentDeck);

    const metaDecks = await storage.getMetaDecks({ limit: 50 });
    const currentSet = new Set(currentDeck.map((c) => normalizeDeckKey(c)));

    const metaSimilarDecks = metaDecks
      .map((deck) => {
        const deckSet = new Set(deck.cards.map((c) => normalizeDeckKey(c)));
        const shared = Array.from(currentSet).filter((c) => deckSet.has(c)).length;

        const games = typeof deck.usageCount === "number" ? deck.usageCount : 0;
        const wins = typeof (deck as any).wins === "number" ? (deck as any).wins : 0;
        const storedAvgElixir = typeof (deck as any).avgElixir === "number" ? (deck as any).avgElixir : null;
        const avgElixir = storedAvgElixir !== null ? storedAvgElixir : computeAvgElixir(deck.cards, cardIndex);
        const storedWinRate = typeof (deck as any).winRateEstimate === "number" ? (deck as any).winRateEstimate : null;
        const winRateEstimate =
          storedWinRate !== null
            ? storedWinRate
            : games > 0
              ? Number((((wins + 1) / (games + 2)) * 100).toFixed(2))
              : 50;

        return {
          cards: deck.cards,
          shared,
          avgElixir,
          winRateEstimate,
          games,
        };
      })
      .filter((deck) => deck.shared >= 4)
      .sort((a, b) => {
        if (b.shared !== a.shared) return b.shared - a.shared;
        if ((b.winRateEstimate ?? 0) !== (a.winRateEstimate ?? 0)) return (b.winRateEstimate ?? 0) - (a.winRateEstimate ?? 0);
        return (b.games ?? 0) - (a.games ?? 0);
      })
      .slice(0, 5);

    const ai = await generateDeckOptimizationSuggestion(
      {
        currentDeck,
        avgElixirBefore,
        goal,
        targetCardKey,
        winCondition,
        metaSimilarDecks: metaSimilarDecks.map((d) => ({
          cards: d.cards,
          avgElixir: d.avgElixir,
          winRateEstimate: d.winRateEstimate,
          games: d.games,
        })),
        language,
      },
      { provider: "openai", route, userId, requestId: getResponseRequestId(res) },
    );

    let newDeck = ai.newDeck;
    const validAiDeck =
      isValidDeckCards(newDeck) &&
      newDeck.every((card) => cardIndex.byNameLower.has(normalizeDeckKey(card))) &&
      (!winCondition || newDeck.map((c) => normalizeDeckKey(c)).includes(normalizeDeckKey(winCondition)));

    if (!validAiDeck) {
      newDeck = metaSimilarDecks[0]?.cards?.slice(0, 8) ?? currentDeck;
    }

    if (!isValidDeckCards(newDeck)) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 500,
        error: { code: "DECK_OPTIMIZER_FAILED", message: "Failed to generate a valid optimized deck" },
      });
    }

    const avgElixirAfter = computeAvgElixir(newDeck, cardIndex);
    const importLink = buildClashDeckImportLink(newDeck, cardIndex, language) ?? "";

    if (!isPro) {
      await storage.incrementDeckSuggestionUsage(userId, "optimizer");
    }

    return res.json({
      originalDeck: { cards: currentDeck, avgElixir: avgElixirBefore },
      suggestedDeck: { cards: newDeck, avgElixir: avgElixirAfter },
      changes: computeChanges(currentDeck, newDeck),
      explanation: ai.explanation,
      importLink,
    });
  } catch (error) {
    console.error("Error optimizing deck:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "DECK_OPTIMIZER_FAILED", message: "Failed to optimize deck" },
    });
  }
});

export default router;
