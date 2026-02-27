/**
 * Unit tests for SEO constants — arena/card catalog, slug lookups.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_CATALOG,
  CARD_CATALOG,
  getArenaBySlug,
  getArenaById,
  getCardBySlug,
  getCardByName,
} from "./constants";

// ── Arena catalog tests ──────────────────────────────────────────────────────

test("ARENA_CATALOG: has at least 10 arenas (AC1)", () => {
  assert.ok(ARENA_CATALOG.length >= 10, `Expected >= 10 arenas, got ${ARENA_CATALOG.length}`);
});

test("ARENA_CATALOG: each arena has required fields", () => {
  for (const arena of ARENA_CATALOG) {
    assert.ok(typeof arena.id === "number", `Arena ${arena.name}: id must be number`);
    assert.ok(typeof arena.name === "string" && arena.name.length > 0, `Arena id=${arena.id}: name must be non-empty string`);
    assert.ok(typeof arena.slug === "string" && arena.slug.length > 0, `Arena ${arena.name}: slug must be non-empty string`);
    assert.ok(typeof arena.trophyRange === "string", `Arena ${arena.name}: trophyRange must be string`);
  }
});

test("ARENA_CATALOG: slugs are unique", () => {
  const slugs = ARENA_CATALOG.map((a) => a.slug);
  const uniqueSlugs = new Set(slugs);
  assert.equal(slugs.length, uniqueSlugs.size, "All arena slugs must be unique");
});

test("ARENA_CATALOG: ids are unique", () => {
  const ids = ARENA_CATALOG.map((a) => a.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, "All arena ids must be unique");
});

test("getArenaBySlug: returns correct arena", () => {
  const arena = getArenaBySlug("legendary-arena");
  assert.ok(arena);
  assert.equal(arena.name, "Legendary Arena");
  assert.equal(arena.id, 20);
});

test("getArenaBySlug: returns undefined for unknown slug", () => {
  const arena = getArenaBySlug("nonexistent-arena");
  assert.equal(arena, undefined);
});

test("getArenaById: returns correct arena", () => {
  const arena = getArenaById(15);
  assert.ok(arena);
  assert.equal(arena.name, "Miner's Mine");
  assert.equal(arena.slug, "miners-mine");
});

test("getArenaById: returns undefined for unknown id", () => {
  const arena = getArenaById(999);
  assert.equal(arena, undefined);
});

// ── Card catalog tests ──────────────────────────────────────────────────────

test("CARD_CATALOG: has at least 30 cards (AC4)", () => {
  assert.ok(CARD_CATALOG.length >= 30, `Expected >= 30 cards, got ${CARD_CATALOG.length}`);
});

test("CARD_CATALOG: each card has required fields", () => {
  for (const card of CARD_CATALOG) {
    assert.ok(typeof card.name === "string" && card.name.length > 0, `Card: name must be non-empty string`);
    assert.ok(typeof card.slug === "string" && card.slug.length > 0, `Card ${card.name}: slug must be non-empty string`);
    assert.ok(typeof card.description === "string" && card.description.length > 0, `Card ${card.name}: description must be non-empty string`);
    assert.ok(["Common", "Rare", "Epic", "Legendary", "Champion"].includes(card.rarity), `Card ${card.name}: invalid rarity "${card.rarity}"`);
  }
});

test("CARD_CATALOG: slugs are unique", () => {
  const slugs = CARD_CATALOG.map((c) => c.slug);
  const uniqueSlugs = new Set(slugs);
  assert.equal(slugs.length, uniqueSlugs.size, "All card slugs must be unique");
});

test("getCardBySlug: returns correct card", () => {
  const card = getCardBySlug("mega-knight");
  assert.ok(card);
  assert.equal(card.name, "Mega Knight");
  assert.equal(card.rarity, "Legendary");
});

test("getCardBySlug: returns undefined for unknown slug", () => {
  const card = getCardBySlug("nonexistent-card");
  assert.equal(card, undefined);
});

test("getCardByName: returns correct card (case insensitive)", () => {
  const card = getCardByName("hog rider");
  assert.ok(card);
  assert.equal(card.slug, "hog-rider");

  const card2 = getCardByName("HOG RIDER");
  assert.ok(card2);
  assert.equal(card2.slug, "hog-rider");
});

test("getCardByName: returns undefined for unknown name", () => {
  const card = getCardByName("nonexistent card");
  assert.equal(card, undefined);
});

// ── Slug format tests ────────────────────────────────────────────────────────

test("ARENA_CATALOG: slugs are URL-safe", () => {
  const safeSlugPattern = /^[a-z0-9-]+$/;
  for (const arena of ARENA_CATALOG) {
    assert.match(arena.slug, safeSlugPattern, `Arena slug "${arena.slug}" contains invalid characters`);
  }
});

test("CARD_CATALOG: slugs are URL-safe", () => {
  const safeSlugPattern = /^[a-z0-9-]+$/;
  for (const card of CARD_CATALOG) {
    assert.match(card.slug, safeSlugPattern, `Card slug "${card.slug}" contains invalid characters`);
  }
});
