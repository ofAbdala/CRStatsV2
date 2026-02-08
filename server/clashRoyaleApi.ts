// Clash Royale API integration
// Using RoyaleAPI proxy to avoid IP whitelist issues
const BASE_URL = process.env.CLASH_ROYALE_API_URL || "https://proxy.royaleapi.dev/v1";
const API_KEY = process.env.CLASH_ROYALE_API_KEY;

if (!API_KEY) {
  console.warn("Warning: CLASH_ROYALE_API_KEY not set. Clash Royale API features will not work.");
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

async function clashRoyaleRequest<T>(endpoint: string): Promise<ClashRoyaleApiResponse<T>> {
  if (!API_KEY) {
    return {
      error: "API key not configured",
      status: 500,
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Clash Royale API error (${response.status}):`, errorText);

      return {
        error: normalizeApiError(response.status, errorText),
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    console.error("Clash Royale API request failed:", error);
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
