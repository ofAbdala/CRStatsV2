/**
 * Unit tests for SEO template functions.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  renderArenaMetaPage,
  renderCounterPage,
  renderPlayerPage,
  render404Page,
  type ArenaMetaPageInput,
  type CounterPageInput,
  type PlayerPageInput,
} from "./templates";

// ── Helpers ─────────────────────────────────────────────────────────────────

function assertHtmlContains(html: string, expected: string, message?: string) {
  assert.ok(html.includes(expected), message || `Expected HTML to contain: "${expected}"`);
}

function assertHtmlNotContains(html: string, unexpected: string, message?: string) {
  assert.ok(!html.includes(unexpected), message || `Expected HTML NOT to contain: "${unexpected}"`);
}

// ── Arena Meta Page tests ────────────────────────────────────────────────────

test("renderArenaMetaPage: produces valid HTML with meta tags (AC1, AC3, AC9)", () => {
  const input: ArenaMetaPageInput = {
    arenaName: "Legendary Arena",
    arenaSlug: "legendary-arena",
    arenaId: 20,
    trophyRange: "6600-6999",
    decks: [
      {
        rank: 1,
        cards: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
        winRate: 58.3,
        usageRate: 0.045,
        threeCrownRate: 0.12,
        sampleSize: 1200,
        archetype: "Hog Cycle",
      },
      {
        rank: 2,
        cards: ["Golem", "Night Witch", "Lumberjack", "Baby Dragon", "Mega Minion", "Tornado", "Barb Barrel", "Lightning"],
        winRate: 55.1,
        usageRate: 0.032,
        threeCrownRate: 0.25,
        sampleSize: 800,
        archetype: "Golem Beatdown",
      },
    ],
    allArenas: [
      { name: "Legendary Arena", slug: "legendary-arena" },
      { name: "Dragon Spa", slug: "dragon-spa" },
    ],
  };

  const html = renderArenaMetaPage(input);

  // AC3: HTML document structure
  assertHtmlContains(html, "<!DOCTYPE html>");
  assertHtmlContains(html, "<html lang=\"en\">");

  // AC9: SEO meta tags
  assertHtmlContains(html, "<title>Best Decks for Legendary Arena - CRStats</title>");
  assertHtmlContains(html, 'name="description"');
  assertHtmlContains(html, 'property="og:title"');
  assertHtmlContains(html, 'property="og:description"');
  assertHtmlContains(html, 'property="og:url"');
  assertHtmlContains(html, 'property="og:type"');
  assertHtmlContains(html, 'property="og:site_name"');
  assertHtmlContains(html, 'name="keywords"');

  // AC12: Canonical URL
  assertHtmlContains(html, 'rel="canonical" href="');
  assertHtmlContains(html, "/meta/legendary-arena");

  // JSON-LD structured data
  assertHtmlContains(html, 'type="application/ld+json"');
  assertHtmlContains(html, '"@context":"https://schema.org"');
  assertHtmlContains(html, '"@type":"WebPage"');

  // AC2: Deck data displayed
  assertHtmlContains(html, "Hog Rider");
  assertHtmlContains(html, "58.3%");
  assertHtmlContains(html, "1,200");
  assertHtmlContains(html, "Win Rate");
  assertHtmlContains(html, "Usage Rate");
  assertHtmlContains(html, "3-Crown");
  assertHtmlContains(html, "Sample Size");

  // Arena navigation
  assertHtmlContains(html, "arena-link-active");
  assertHtmlContains(html, "Dragon Spa");

  // Breadcrumb
  assertHtmlContains(html, "Home");
  assertHtmlContains(html, "Meta Decks");

  // Footer with Supercell disclaimer
  assertHtmlContains(html, "Supercell");
});

test("renderArenaMetaPage: handles empty decks gracefully", () => {
  const input: ArenaMetaPageInput = {
    arenaName: "Hog Mountain",
    arenaSlug: "hog-mountain",
    arenaId: 10,
    trophyRange: "3000-3399",
    decks: [],
    allArenas: [{ name: "Hog Mountain", slug: "hog-mountain" }],
    limitedData: true,
  };

  const html = renderArenaMetaPage(input);
  assertHtmlContains(html, "No deck data available");
  assertHtmlNotContains(html, "<tbody>");
});

test("renderArenaMetaPage: escapes HTML in arena names", () => {
  const input: ArenaMetaPageInput = {
    arenaName: "Rascal's Hideout",
    arenaSlug: "rascals-hideout",
    arenaId: 13,
    trophyRange: "4200-4599",
    decks: [],
    allArenas: [],
  };

  const html = renderArenaMetaPage(input);
  assertHtmlContains(html, "Rascal&#039;s Hideout");
  assertHtmlNotContains(html, "Rascal's Hideout</title>"); // should be escaped in title
});

// ── Counter Page tests ──────────────────────────────────────────────────────

test("renderCounterPage: produces valid HTML with counter data (AC4, AC5, AC6)", () => {
  const input: CounterPageInput = {
    cardName: "Mega Knight",
    cardSlug: "mega-knight",
    cardDescription: "A powerful troop that deals splash damage on deploy.",
    cardRarity: "Legendary",
    decks: [
      {
        rank: 1,
        cards: ["P.E.K.K.A", "Electro Wizard", "Bandit", "Royal Ghost", "Poison", "Zap", "Battle Ram", "Dark Prince"],
        winRateVsTarget: 62.5,
        sampleSize: 500,
        threeCrownRate: 0.18,
      },
    ],
  };

  const html = renderCounterPage(input);

  // AC6: Card description
  assertHtmlContains(html, "A powerful troop that deals splash damage on deploy.");
  assertHtmlContains(html, "Legendary");

  // AC9: SEO meta tags
  assertHtmlContains(html, "<title>Best Counter Decks for Mega Knight - CRStats</title>");
  assertHtmlContains(html, 'name="description"');
  assertHtmlContains(html, 'name="keywords"');
  assertHtmlContains(html, "counter Mega Knight");

  // AC12: Canonical URL
  assertHtmlContains(html, "/counter/mega-knight");

  // AC5: Counter deck data
  assertHtmlContains(html, "P.E.K.K.A");
  assertHtmlContains(html, "62.5%");
  assertHtmlContains(html, "Win Rate vs Mega Knight");
});

test("renderCounterPage: shows limited data banner", () => {
  const input: CounterPageInput = {
    cardName: "Golem",
    cardSlug: "golem",
    cardDescription: "Slow but powerful tank.",
    cardRarity: "Epic",
    decks: [{ rank: 1, cards: ["P.E.K.K.A", "Electro Wizard", "Bandit", "Royal Ghost", "Poison", "Zap", "Battle Ram", "Dark Prince"], winRateVsTarget: 55.0, sampleSize: 30, threeCrownRate: 0.1 }],
    limitedData: true,
  };

  const html = renderCounterPage(input);
  assertHtmlContains(html, "Limited data available");
});

// ── Player Page tests ───────────────────────────────────────────────────────

test("renderPlayerPage: produces valid HTML with player stats (AC7, AC8)", () => {
  const input: PlayerPageInput = {
    tag: "#ABC123",
    name: "SuperPlayer",
    trophies: 7500,
    bestTrophies: 8200,
    level: 14,
    clan: "TopClan",
    wins: 5000,
    losses: 3000,
    battleCount: 8000,
    currentDeck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
    recentBattles: [
      {
        type: "Ladder",
        isWin: true,
        crowns: 3,
        opponentCrowns: 1,
        trophyChange: 30,
        deck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
      },
    ],
  };

  const html = renderPlayerPage(input);

  // AC7: Player stats
  assertHtmlContains(html, "SuperPlayer");
  assertHtmlContains(html, "#ABC123");
  assertHtmlContains(html, "7,500");
  assertHtmlContains(html, "8,200");
  assertHtmlContains(html, "TopClan");
  assertHtmlContains(html, "Level 14");

  // AC8: Open Graph meta tags
  assertHtmlContains(html, 'property="og:title"');
  assertHtmlContains(html, 'property="og:description"');
  assertHtmlContains(html, 'og:type" content="profile"');

  // AC9: SEO meta tags
  assertHtmlContains(html, "<title>SuperPlayer (#ABC123) - Player Stats - CRStats</title>");
  assertHtmlContains(html, 'name="keywords"');

  // AC12: Canonical URL
  assertHtmlContains(html, "/player/ABC123");

  // Current deck
  assertHtmlContains(html, "Current Deck");
  assertHtmlContains(html, "Hog Rider");

  // Recent battles
  assertHtmlContains(html, "Recent Battles");
  assertHtmlContains(html, "WIN");
  assertHtmlContains(html, "+30");
});

test("renderPlayerPage: handles player without clan", () => {
  const input: PlayerPageInput = {
    tag: "#XYZ789",
    name: "LoneWolf",
    trophies: 4000,
    bestTrophies: 4500,
    level: 10,
    clan: null,
    wins: 1000,
    losses: 800,
    battleCount: 1800,
    currentDeck: [],
    recentBattles: [],
  };

  const html = renderPlayerPage(input);
  assertHtmlNotContains(html, "Member of");
  assertHtmlNotContains(html, "Current Deck");
  assertHtmlNotContains(html, "Recent Battles");
});

// ── 404 Page tests ──────────────────────────────────────────────────────────

test("render404Page: produces valid HTML with error message", () => {
  const html = render404Page("Arena not found.");

  assertHtmlContains(html, "<!DOCTYPE html>");
  assertHtmlContains(html, "Page Not Found");
  assertHtmlContains(html, "Arena not found.");
  assertHtmlContains(html, "Browse Meta Decks");
  assertHtmlContains(html, "Browse Counter Decks");
});

test("render404Page: escapes HTML in message", () => {
  const html = render404Page('<script>alert("xss")</script>');
  assertHtmlNotContains(html, '<script>alert("xss")</script>');
  assertHtmlContains(html, "&lt;script&gt;");
});
