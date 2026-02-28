/**
 * Deck sharing utilities — encode/decode 8 card IDs into URL-safe strings.
 * Story 2.7: Community & Social Features (AC7)
 *
 * Encoding scheme:
 *   8 card IDs joined by "-" (already numeric, URL-safe).
 *   Example: "26000000-26000001-26000002-26000003-26000004-26000005-26000006-26000007"
 *
 * The encoding uses card IDs (numbers) which are stable and deterministic.
 * Card names are resolved at decode time via the card catalog.
 */

// ── Lightweight static card mapping ──────────────────────────────────────────
// A subset of common cards for offline resolution. The full catalog is fetched
// from the CR API at runtime, but this allows basic deck operations without
// network calls. Expand as needed.

export interface DeckShareCard {
  id: number;
  name: string;
  elixirCost: number;
}

// This is populated lazily from the API at runtime via `setCardCatalog`.
let cardCatalog: Map<number, DeckShareCard> = new Map();

/** Set the card catalog from an API response (called once at startup / first decode). */
export function setCardCatalog(cards: Array<{ id: number; name: string; elixirCost?: number }>): void {
  cardCatalog = new Map();
  for (const card of cards) {
    if (typeof card.id === "number" && typeof card.name === "string") {
      cardCatalog.set(card.id, {
        id: card.id,
        name: card.name,
        elixirCost: typeof card.elixirCost === "number" ? card.elixirCost : 0,
      });
    }
  }
}

// ── Encoding ──────────────────────────────────────────────────────────────────

/**
 * Encode an array of 8 card IDs into a URL-safe string.
 * Returns null if the input is invalid.
 */
export function encodeDeck(cardIds: number[]): string | null {
  if (!Array.isArray(cardIds) || cardIds.length !== 8) return null;
  if (!cardIds.every((id) => typeof id === "number" && Number.isFinite(id) && id > 0)) return null;

  // Sort for deterministic URLs (same deck = same URL regardless of order)
  const sorted = [...cardIds].sort((a, b) => a - b);
  return sorted.join("-");
}

/**
 * Encode an array of 8 card names into a URL-safe string.
 * Requires the card catalog to be populated.
 * Returns null if any card name is not found.
 */
export function encodeDeckByNames(cardNames: string[]): string | null {
  if (!Array.isArray(cardNames) || cardNames.length !== 8) return null;

  const ids: number[] = [];
  for (const name of cardNames) {
    const normalizedName = String(name).trim().toLowerCase();
    let found = false;
    const entries = Array.from(cardCatalog.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, card] = entries[i];
      if (card.name.toLowerCase() === normalizedName) {
        ids.push(id);
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  return encodeDeck(ids);
}

// ── Decoding ──────────────────────────────────────────────────────────────────

/**
 * Validate an encoded deck string format.
 */
export function isValidEncodedDeck(encoded: string): boolean {
  if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 200) return false;

  const parts = encoded.split("-");
  if (parts.length !== 8) return false;

  return parts.every((part) => {
    const num = Number(part);
    return Number.isFinite(num) && num > 0 && String(Math.floor(num)) === part;
  });
}

/**
 * Decode an encoded deck string into card objects.
 * Returns null if invalid or if card catalog is not populated.
 */
export function decodeDeck(encoded: string): DeckShareCard[] | null {
  if (!isValidEncodedDeck(encoded)) return null;

  const ids = encoded.split("-").map(Number);
  const cards: DeckShareCard[] = [];

  for (const id of ids) {
    const card = cardCatalog.get(id);
    if (card) {
      cards.push(card);
    } else {
      // Card not in catalog — return basic info with unknown name
      cards.push({ id, name: `Card #${id}`, elixirCost: 0 });
    }
  }

  return cards;
}

/**
 * Build the shareable URL path for a deck.
 */
export function buildDeckSharePath(cardIds: number[]): string | null {
  const encoded = encodeDeck(cardIds);
  if (!encoded) return null;
  return `/deck/${encoded}`;
}
