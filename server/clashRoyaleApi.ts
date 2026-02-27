// Clash Royale API integration
// Using RoyaleAPI proxy to avoid IP whitelist issues
import { logger } from "./logger";

const BASE_URL = process.env.CLASH_ROYALE_API_URL || "https://proxy.royaleapi.dev/v1";
const API_KEY = process.env.CLASH_ROYALE_API_KEY;

/** Timeout in milliseconds for Clash Royale API requests (AC9). */
const CLASH_ROYALE_TIMEOUT_MS = 5_000;

if (!API_KEY) {
  logger.warn("CLASH_ROYALE_API_KEY not set. Clash Royale API features will not work.", {
    provider: "clash-royale",
  });
}

interface ClashRoyaleApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

function normalizeApiError(status: number, errorText: string): string {
  if (status === 404) return "Resource not found";
  if (status === 429) return "Rate limit reached";
  if (status >= 500) return "Temporary provider error";
  if (errorText) return `API error: ${status}`;
  return "Unknown provider error";
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

async function clashRoyaleRequest<T>(endpoint: string): Promise<ClashRoyaleApiResponse<T>> {
  if (!API_KEY) {
    return {
      error: "API key not configured",
      status: 500,
    };
  }

  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLASH_ROYALE_TIMEOUT_MS);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Clash Royale API error response", {
        provider: "clash-royale",
        endpoint,
        status: response.status,
        message: errorText,
        durationMs,
      });

      return {
        error: normalizeApiError(response.status, errorText),
        status: response.status,
      };
    }

    logger.debug("Clash Royale API call succeeded", {
      provider: "clash-royale",
      endpoint,
      status: response.status,
      durationMs,
    });

    const data = (await response.json()) as T;
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    const durationMs = Date.now() - start;

    if (isTimeoutError(error)) {
      logger.error("Clash Royale API timeout", {
        provider: "clash-royale",
        endpoint,
        timeoutMs: CLASH_ROYALE_TIMEOUT_MS,
        durationMs,
      });
      return {
        error: `Clash Royale API timed out after ${CLASH_ROYALE_TIMEOUT_MS}ms`,
        status: 504,
      };
    }

    logger.error("Clash Royale API connection failure", {
      provider: "clash-royale",
      endpoint,
      message: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return {
      error: "Failed to connect to Clash Royale API",
      status: 500,
    };
  }
}

function encodeTag(tag: string): string {
  const cleanTag = tag.replace("#", "");
  return encodeURIComponent(`#${cleanTag}`);
}

export async function getPlayerByTag(tag: string) {
  return clashRoyaleRequest(`/players/${encodeTag(tag)}`);
}

export async function getPlayerBattles(tag: string) {
  return clashRoyaleRequest(`/players/${encodeTag(tag)}/battlelog`);
}

export async function getCards() {
  return clashRoyaleRequest("/cards");
}

export async function getPlayerRankings(locationId: string = "global") {
  return clashRoyaleRequest(`/locations/${encodeURIComponent(locationId)}/rankings/players`);
}

export async function getClanRankings(locationId: string = "global") {
  return clashRoyaleRequest(`/locations/${encodeURIComponent(locationId)}/rankings/clans`);
}

export async function getClanByTag(tag: string) {
  return clashRoyaleRequest(`/clans/${encodeTag(tag)}`);
}

export async function getClanMembers(tag: string) {
  return clashRoyaleRequest(`/clans/${encodeTag(tag)}/members`);
}

export async function getTopPlayersInLocation(locationId: string = "global", limit: number = 50) {
  const rankings = await getPlayerRankings(locationId);

  if (!rankings.data) {
    return rankings;
  }

  const original = rankings.data as { items?: unknown[] };
  const items = Array.isArray(original.items) ? original.items.slice(0, limit) : [];

  return {
    status: rankings.status,
    data: {
      ...original,
      items,
    },
  };
}
