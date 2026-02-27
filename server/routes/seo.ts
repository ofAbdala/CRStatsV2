/**
 * SEO routes — server-rendered HTML pages for search engine crawling.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 *
 * Routes:
 *   GET /meta/:arenaSlug     — Arena meta deck page (AC1, AC2, AC3)
 *   GET /counter/:cardSlug   — Counter deck page (AC4, AC5, AC6)
 *   GET /player/:tag         — Public player profile (AC7, AC8)
 *   GET /sitemap.xml         — Auto-generated sitemap (AC10)
 *   GET /robots.txt          — Crawling rules (AC11)
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getArenaBySlug, ARENA_CATALOG, getCardBySlug } from "../seo/constants";
import { fetchArenaMetaDecks, fetchCounterDecks, fetchPlayerProfile, buildSitemapXml, buildRobotsTxt } from "../seo/data";
import { renderArenaMetaPage, renderCounterPage, renderPlayerPage, render404Page } from "../seo/templates";
import { logger } from "../logger";

const router = Router();

// Rate limiter for SEO pages — generous since these are public
const seoLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || "unknown",
  message: "Rate limit exceeded. Please wait before making more requests.",
});

// ── Cache headers helper ────────────────────────────────────────────────────

function setSeoHeaders(res: any, maxAge: number = 3600): void {
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
}

// ── GET /sitemap.xml (AC10) ──────────────────────────────────────────────────

router.get("/sitemap.xml", (req, res) => {
  try {
    const xml = buildSitemapXml();
    setSeoHeaders(res, 86400); // 24 hour cache
    res.type("application/xml").send(xml);
  } catch (error) {
    logger.error("SEO: Error generating sitemap", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).type("text/plain").send("Error generating sitemap");
  }
});

// ── GET /robots.txt (AC11) ──────────────────────────────────────────────────

router.get("/robots.txt", (req, res) => {
  const txt = buildRobotsTxt();
  setSeoHeaders(res, 86400); // 24 hour cache
  res.type("text/plain").send(txt);
});

// ── GET /meta/:arenaSlug (AC1, AC2, AC3) ────────────────────────────────────

router.get("/meta/:arenaSlug", seoLimiter, async (req, res) => {
  try {
    const { arenaSlug } = req.params;
    const arena = getArenaBySlug(arenaSlug);

    if (!arena) {
      res.status(404).type("html").send(render404Page(`Arena "${arenaSlug}" not found. Check the URL or browse available arenas.`));
      return;
    }

    const decks = await fetchArenaMetaDecks(arena.id);

    const html = renderArenaMetaPage({
      arenaName: arena.name,
      arenaSlug: arena.slug,
      arenaId: arena.id,
      trophyRange: arena.trophyRange,
      decks,
      allArenas: ARENA_CATALOG.map((a) => ({ name: a.name, slug: a.slug })),
      limitedData: decks.length === 0,
    });

    setSeoHeaders(res, 3600); // 1 hour cache
    res.type("html").send(html);
  } catch (error) {
    logger.error("SEO: Error rendering meta page", {
      arenaSlug: req.params.arenaSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).type("html").send(render404Page("An error occurred while loading this page. Please try again later."));
  }
});

// ── GET /counter/:cardSlug (AC4, AC5, AC6) ──────────────────────────────────

router.get("/counter/:cardSlug", seoLimiter, async (req, res) => {
  try {
    const { cardSlug } = req.params;
    const card = getCardBySlug(cardSlug);

    if (!card) {
      res.status(404).type("html").send(render404Page(`Card "${cardSlug}" not found. Check the URL or browse available counter pages.`));
      return;
    }

    const { decks, limitedData } = await fetchCounterDecks(card.name);

    const html = renderCounterPage({
      cardName: card.name,
      cardSlug: card.slug,
      cardDescription: card.description,
      cardRarity: card.rarity,
      decks,
      limitedData,
    });

    setSeoHeaders(res, 3600); // 1 hour cache
    res.type("html").send(html);
  } catch (error) {
    logger.error("SEO: Error rendering counter page", {
      cardSlug: req.params.cardSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).type("html").send(render404Page("An error occurred while loading this page. Please try again later."));
  }
});

// ── GET /player/:tag (AC7, AC8) ──────────────────────────────────────────────

router.get("/player/:tag", seoLimiter, async (req, res) => {
  try {
    const { tag } = req.params;
    // Validate tag format: 2-16 alphanumeric characters
    const cleanTag = tag.replace(/^#/, "").toUpperCase();
    if (!/^[A-Z0-9]{2,16}$/.test(cleanTag)) {
      res.status(400).type("html").send(render404Page("Invalid player tag format. Tags should be 2-16 alphanumeric characters."));
      return;
    }

    const profile = await fetchPlayerProfile(cleanTag);

    if (!profile) {
      res.status(404).type("html").send(render404Page(`Player with tag #${cleanTag} not found. The tag may be incorrect or the player's account may not be publicly accessible.`));
      return;
    }

    const html = renderPlayerPage(profile);
    setSeoHeaders(res, 600); // 10 min cache for player profiles
    res.type("html").send(html);
  } catch (error) {
    logger.error("SEO: Error rendering player page", {
      tag: req.params.tag,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).type("html").send(render404Page("An error occurred while loading this page. Please try again later."));
  }
});

export default router;
