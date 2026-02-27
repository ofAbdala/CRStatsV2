/**
 * Unit tests for SEO data functions (sitemap.xml, robots.txt).
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 *
 * Note: DB-dependent functions (fetchArenaMetaDecks, fetchCounterDecks,
 * fetchPlayerProfile) are tested via integration tests. These unit tests
 * cover the pure functions that generate sitemap.xml and robots.txt.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildSitemapXml, buildRobotsTxt } from "./sitemap";
import { ARENA_CATALOG, CARD_CATALOG } from "./constants";

// ── Sitemap.xml tests (AC10) ────────────────────────────────────────────────

test("buildSitemapXml: produces valid XML structure", () => {
  const xml = buildSitemapXml();

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Must start with XML declaration");
  assert.ok(xml.includes("<urlset"), "Must contain <urlset>");
  assert.ok(xml.includes("</urlset>"), "Must close </urlset>");
  assert.ok(xml.includes("http://www.sitemaps.org/schemas/sitemap/0.9"), "Must reference sitemap schema");
});

test("buildSitemapXml: includes all arena meta pages", () => {
  const xml = buildSitemapXml();

  for (const arena of ARENA_CATALOG) {
    assert.ok(
      xml.includes(`/meta/${arena.slug}`),
      `Sitemap must include arena: ${arena.name} (/meta/${arena.slug})`,
    );
  }
});

test("buildSitemapXml: includes all card counter pages", () => {
  const xml = buildSitemapXml();

  for (const card of CARD_CATALOG) {
    assert.ok(
      xml.includes(`/counter/${card.slug}`),
      `Sitemap must include card: ${card.name} (/counter/${card.slug})`,
    );
  }
});

test("buildSitemapXml: includes lastmod dates", () => {
  const xml = buildSitemapXml();
  assert.ok(xml.includes("<lastmod>"), "Must contain <lastmod> tags");
});

test("buildSitemapXml: includes changefreq and priority", () => {
  const xml = buildSitemapXml();
  assert.ok(xml.includes("<changefreq>daily</changefreq>"), "Must set changefreq to daily");
  assert.ok(xml.includes("<priority>"), "Must include priority");
});

test("buildSitemapXml: total URL count matches arenas + cards", () => {
  const xml = buildSitemapXml();
  const urlCount = (xml.match(/<url>/g) || []).length;
  const expectedCount = ARENA_CATALOG.length + CARD_CATALOG.length;
  assert.equal(urlCount, expectedCount, `Expected ${expectedCount} URLs, got ${urlCount}`);
});

// ── robots.txt tests (AC11) ─────────────────────────────────────────────────

test("buildRobotsTxt: allows crawling of public pages", () => {
  const txt = buildRobotsTxt();

  assert.ok(txt.includes("Allow: /meta/"), "Must allow /meta/");
  assert.ok(txt.includes("Allow: /counter/"), "Must allow /counter/");
  assert.ok(txt.includes("Allow: /player/"), "Must allow /player/");
  assert.ok(txt.includes("Allow: /sitemap.xml"), "Must allow /sitemap.xml");
});

test("buildRobotsTxt: blocks authenticated routes", () => {
  const txt = buildRobotsTxt();

  assert.ok(txt.includes("Disallow: /api/"), "Must disallow /api/");
  assert.ok(txt.includes("Disallow: /auth/"), "Must disallow /auth/");
  assert.ok(txt.includes("Disallow: /settings"), "Must disallow /settings");
  assert.ok(txt.includes("Disallow: /billing"), "Must disallow /billing");
});

test("buildRobotsTxt: includes sitemap URL", () => {
  const txt = buildRobotsTxt();
  assert.ok(txt.includes("Sitemap:"), "Must include Sitemap directive");
  assert.ok(txt.includes("/sitemap.xml"), "Must reference sitemap.xml");
});

test("buildRobotsTxt: uses User-agent: *", () => {
  const txt = buildRobotsTxt();
  assert.ok(txt.includes("User-agent: *"), "Must apply to all user agents");
});
