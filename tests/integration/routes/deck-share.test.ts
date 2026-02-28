/**
 * Unit/integration tests for Story 2.7: Deck share encoding/decoding utilities.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeDeck,
  decodeDeck,
  isValidEncodedDeck,
  setCardCatalog,
  buildDeckSharePath,
  encodeDeckByNames,
} from "../../../server/domain/deckShare";

// ── Setup ──────────────────────────────────────────────────────────────────────

test("DeckShare: setup card catalog", () => {
  setCardCatalog([
    { id: 26000000, name: "Knight", elixirCost: 3 },
    { id: 26000001, name: "Archers", elixirCost: 3 },
    { id: 26000002, name: "Goblins", elixirCost: 2 },
    { id: 26000003, name: "Giant", elixirCost: 5 },
    { id: 26000004, name: "P.E.K.K.A", elixirCost: 7 },
    { id: 26000005, name: "Minions", elixirCost: 3 },
    { id: 26000006, name: "Balloon", elixirCost: 5 },
    { id: 26000007, name: "Witch", elixirCost: 5 },
  ]);
});

// ── Encoding ───────────────────────────────────────────────────────────────────

test("DeckShare: encodeDeck produces sorted hyphen-joined string", () => {
  const ids = [26000007, 26000000, 26000003, 26000001, 26000005, 26000002, 26000006, 26000004];
  const encoded = encodeDeck(ids);
  assert.equal(encoded, "26000000-26000001-26000002-26000003-26000004-26000005-26000006-26000007");
});

test("DeckShare: encodeDeck returns null for wrong count", () => {
  assert.equal(encodeDeck([1, 2, 3]), null);
  assert.equal(encodeDeck([]), null);
});

test("DeckShare: encodeDeck returns null for invalid IDs", () => {
  assert.equal(encodeDeck([0, 1, 2, 3, 4, 5, 6, 7]), null); // 0 is not > 0
  assert.equal(encodeDeck([NaN, 1, 2, 3, 4, 5, 6, 7]), null);
});

test("DeckShare: encodeDeck is deterministic (same cards = same URL)", () => {
  const ids1 = [26000007, 26000000, 26000003, 26000001, 26000005, 26000002, 26000006, 26000004];
  const ids2 = [26000000, 26000001, 26000002, 26000003, 26000004, 26000005, 26000006, 26000007];
  assert.equal(encodeDeck(ids1), encodeDeck(ids2));
});

// ── Validation ─────────────────────────────────────────────────────────────────

test("DeckShare: isValidEncodedDeck accepts valid string", () => {
  assert.equal(isValidEncodedDeck("26000000-26000001-26000002-26000003-26000004-26000005-26000006-26000007"), true);
});

test("DeckShare: isValidEncodedDeck rejects invalid formats", () => {
  assert.equal(isValidEncodedDeck(""), false);
  assert.equal(isValidEncodedDeck("abc-def"), false);
  assert.equal(isValidEncodedDeck("1-2-3"), false); // Only 3 parts
  assert.equal(isValidEncodedDeck("0-1-2-3-4-5-6-7"), false); // 0 not > 0
  assert.equal(isValidEncodedDeck("a".repeat(201)), false);
});

// ── Decoding ───────────────────────────────────────────────────────────────────

test("DeckShare: decodeDeck resolves card objects from catalog", () => {
  const encoded = "26000000-26000001-26000002-26000003-26000004-26000005-26000006-26000007";
  const cards = decodeDeck(encoded);
  assert.ok(cards);
  assert.equal(cards.length, 8);
  assert.equal(cards[0].name, "Knight");
  assert.equal(cards[0].id, 26000000);
  assert.equal(cards[0].elixirCost, 3);
  assert.equal(cards[7].name, "Witch");
});

test("DeckShare: decodeDeck returns fallback for unknown card IDs", () => {
  const encoded = "99000000-99000001-99000002-99000003-99000004-99000005-99000006-99000007";
  const cards = decodeDeck(encoded);
  assert.ok(cards);
  assert.equal(cards.length, 8);
  assert.ok(cards[0].name.startsWith("Card #"));
});

test("DeckShare: decodeDeck returns null for invalid string", () => {
  assert.equal(decodeDeck("invalid"), null);
  assert.equal(decodeDeck(""), null);
});

// ── Name-based encoding ────────────────────────────────────────────────────────

test("DeckShare: encodeDeckByNames resolves names to IDs", () => {
  const names = ["Witch", "Knight", "Giant", "Archers", "Minions", "Goblins", "Balloon", "P.E.K.K.A"];
  const encoded = encodeDeckByNames(names);
  assert.ok(encoded);
  assert.equal(encoded, "26000000-26000001-26000002-26000003-26000004-26000005-26000006-26000007");
});

test("DeckShare: encodeDeckByNames returns null for unknown card name", () => {
  const names = ["Knight", "Archers", "Goblins", "Giant", "P.E.K.K.A", "Minions", "Balloon", "NONEXISTENT"];
  assert.equal(encodeDeckByNames(names), null);
});

// ── Path builder ───────────────────────────────────────────────────────────────

test("DeckShare: buildDeckSharePath returns /deck/ prefix", () => {
  const ids = [26000000, 26000001, 26000002, 26000003, 26000004, 26000005, 26000006, 26000007];
  const path = buildDeckSharePath(ids);
  assert.ok(path);
  assert.ok(path.startsWith("/deck/"));
  assert.ok(path.includes("26000000"));
});
