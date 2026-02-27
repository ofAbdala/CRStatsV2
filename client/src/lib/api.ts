// API client utilities for CRStats

import { getSupabaseAccessToken } from "@/lib/supabaseClient";
import type {
  Profile,
  Subscription,
  User,
  UserSettings,
  Goal,
  FavoritePlayer,
  Notification,
  NotificationPreferences,
  ProfileCreateInput,
  ProfileUpdateInput,
  GoalCreateInput,
  GoalUpdateInput,
  FavoriteCreateInput,
} from "@shared/schema";

// ── API-specific types ──────────────────────────────────────────────────────

/** Player data returned by the Clash Royale API proxy */
export interface ClashPlayerData {
  name: string;
  tag: string;
  trophies: number;
  bestTrophies?: number;
  expLevel?: number;
  arena?: { id: number; name: string };
  clan?: { name: string; tag: string; badgeId?: number };
  [key: string]: unknown;
}

/** Battle data as returned by /api/history/battles */
export interface BattleRecord {
  battleTime: string;
  type?: string;
  team?: Array<{
    crowns?: number;
    trophyChange?: number;
    cards?: Array<{
      name: string;
      id?: number;
      level?: number;
      elixirCost?: number;
      iconUrls?: { medium?: string; small?: string };
    }>;
  }>;
  opponent?: Array<{ crowns?: number }>;
  [key: string]: unknown;
}

/** Training plan with drills (API response) */
export interface TrainingPlanResponse {
  id: string;
  title: string;
  source: string;
  status: string;
  pushAnalysisId?: string | null;
  drills: TrainingDrillResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainingDrillResponse {
  id: string;
  planId: string;
  focusArea: string;
  description: string;
  targetGames: number;
  completedGames: number;
  mode: string;
  priority: number;
  status: string;
}

/** Invoice data from /api/billing/invoices */
export interface InvoiceData {
  id: string;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf?: string | null;
}

/** Subscription data from /api/subscription */
export interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

/** Community ranking item */
export interface RankingResponse {
  items: Array<{
    tag: string;
    name: string;
    trophies?: number;
    rank: number;
    clan?: { tag: string; name: string; badgeId?: number };
  }>;
}

/** Stripe product with prices */
export interface StripeProductWithPrices {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  prices: Array<{
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring: { interval: string; interval_count: number } | null;
    active: boolean;
  }>;
}

/** Settings update payload used by the client */
export interface SettingsUpdatePayload {
  theme?: string;
  preferredLanguage?: string;
  notificationsEnabled?: boolean;
  notificationsSystem?: boolean;
  notificationsTraining?: boolean;
  notificationsBilling?: boolean;
  notificationPreferences?: {
    system: boolean;
    training: boolean;
    billing: boolean;
  };
}

/** Public player/clan data */
export interface PublicPlayerData {
  name: string;
  tag: string;
  trophies: number;
  bestTrophies?: number;
  arena?: { id: number; name: string };
  clan?: { name: string; tag: string; badgeId?: number };
  [key: string]: unknown;
}

/** Meta deck data from /api/decks/meta */
export interface MetaDeckData {
  deckHash: string;
  cards: string[];
  avgElixir: number;
  games: number;
  wins: number;
  losses: number;
  winRateEstimate: number;
  archetype: string | null;
  lastUpdatedAt: string;
  cacheStatus?: "fresh" | "stale";
}

/** Arena-personalized meta deck (Story 2.1) */
export interface ArenaMetaDeckData {
  deckHash: string;
  cards: string[];
  arenaId: number;
  winRate: number;
  usageRate: number;
  threeCrownRate: number;
  avgElixir: number | null;
  sampleSize: number;
  archetype: string | null;
  limitedData: boolean;
}

/** Counter deck result from real battle data (Story 2.1) */
export interface CounterDeckData {
  deckHash: string;
  cards: string[];
  winRateVsTarget: number;
  sampleSize: number;
  threeCrownRate: number;
  limitedData: boolean;
}

/** Counter decks API response (Story 2.1) */
export interface CounterDecksResponse {
  targetCard: string;
  arenaId: number;
  limitedData: boolean;
  decks: CounterDeckData[];
}

// ── Story 2.4: Advanced Stats Types ──────────────────────────────────────────

/** Card win rate result from /api/player/stats/cards (AC3) */
export interface CardWinRateData {
  cardId: string;
  battles: number;
  wins: number;
  winRate: number;
}

/** Card stats API response */
export interface CardStatsResponse {
  season: number | null;
  currentSeason: number;
  cards: CardWinRateData[];
}

/** Deck stats result from /api/player/stats/decks (AC1, AC2) */
export interface DeckStatsData {
  deckHash: string;
  cards: string[];
  battles: number;
  wins: number;
  threeCrowns: number;
  threeCrownRate: number;
  winRate: number;
  avgElixir: number | null;
  archetype: string;
}

/** Deck stats API response */
export interface DeckStatsResponse {
  season: number | null;
  currentSeason: number;
  decks: DeckStatsData[];
}

/** Season summary from /api/player/stats/season (AC7, AC8) */
export interface SeasonSummaryResponse {
  season: number;
  seasonLabel: string;
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  peakTrophies: number | null;
  mostUsedDeck: { deckHash: string; cards: string[]; battles: number } | null;
  bestCard: { cardId: string; winRate: number; battles: number } | null;
  availableSeasons: Array<{ season: number; label: string }>;
}

/** Matchup result from /api/player/stats/matchups (AC5, AC6) */
export interface MatchupData {
  opponentArchetype: string;
  battles: number;
  wins: number;
  winRate: number;
}

/** Matchups API response */
export interface MatchupsResponse {
  deckHash: string;
  matchups: MatchupData[];
}

const API_BASE = "/api";

type ApiErrorDetail = { path?: string; message?: string; code?: string } | unknown;

interface ApiErrorResponse {
  code?: string;
  message?: string;
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: ApiErrorDetail[] | ApiErrorDetail;
      };
  details?: ApiErrorDetail[] | ApiErrorDetail;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetail[] | ApiErrorDetail;
  requestId?: string;

  constructor({
    status,
    message,
    code,
    details,
    requestId,
  }: {
    status: number;
    message: string;
    code?: string;
    details?: ApiErrorDetail[] | ApiErrorDetail;
    requestId?: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function normalizeApiErrorPayload(payload: ApiErrorResponse): ApiErrorResponse {
  if (payload.error && typeof payload.error === "object") {
    return {
      ...payload,
      code: payload.code || payload.error.code,
      message: payload.message || payload.error.message,
      details: payload.details || payload.error.details,
    };
  }
  return payload;
}

function detailsToText(details: ApiErrorDetail[] | ApiErrorDetail | undefined): string {
  if (!details) return "";

  if (!Array.isArray(details)) {
    if (typeof details === "object" && details !== null) {
      const detailObject = details as { message?: string; path?: string };
      if (detailObject.message) {
        return detailObject.path ? `${detailObject.path}: ${detailObject.message}` : detailObject.message;
      }
    }
    return "";
  }

  return details
    .map((detail) => {
      if (!detail || typeof detail !== "object") return "";
      const detailObject = detail as { message?: string; path?: string };
      if (!detailObject.message) return "";
      return detailObject.path ? `${detailObject.path}: ${detailObject.message}` : detailObject.message;
    })
    .filter(Boolean)
    .join("; ");
}

function buildErrorMessage(status: number, payload: ApiErrorResponse): string {
  const errorText = typeof payload.error === "string" ? payload.error : undefined;
  const baseMessage = payload.message || errorText || `HTTP ${status}`;
  const detailText = detailsToText(payload.details);
  const withDetails = detailText ? `${baseMessage} - ${detailText}` : baseMessage;
  return payload.code ? `[${payload.code}] ${withDetails}` : withDetails;
}

async function parseErrorPayload(response: Response): Promise<ApiErrorResponse> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    const fallbackText = await response.text().catch(() => "");
    return {
      message: fallbackText || `HTTP ${response.status}`,
    };
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const accessToken = await getSupabaseAccessToken().catch(() => null);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const parsedPayload = await parseErrorPayload(response);
    const payload = normalizeApiErrorPayload(parsedPayload);
    const requestId = payload.requestId || response.headers.get("x-request-id") || undefined;

    throw new ApiError({
      status: response.status,
      code: payload.code,
      details: payload.details,
      message: buildErrorMessage(response.status, payload),
      requestId,
    });
  }

  return response.json();
}

export const api = {
  auth: {
    getUser: () =>
      fetchAPI<User & { profile?: Profile | null; subscription?: Subscription | null; settings?: UserSettings | null }>(
        "/auth/user",
      ),
  },

  profile: {
    get: () => fetchAPI<Profile>("/profile"),
    create: (data: ProfileCreateInput) => fetchAPI<Profile>("/profile", { method: "POST", body: JSON.stringify(data) }),
    update: (data: Partial<ProfileUpdateInput>) => fetchAPI<Profile>("/profile", { method: "PATCH", body: JSON.stringify(data) }),
  },

  subscription: {
    get: () => fetchAPI<SubscriptionData>("/subscription"),
  },

  goals: {
    list: () => fetchAPI<Goal[]>("/goals"),
    create: (data: GoalCreateInput) => fetchAPI<Goal>("/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: GoalUpdateInput) => fetchAPI<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<void>(`/goals/${id}`, { method: "DELETE" }),
  },

  favorites: {
    list: () => fetchAPI<FavoritePlayer[]>("/favorites"),
    create: (data: FavoriteCreateInput & { setAsDefault?: boolean }) => fetchAPI<FavoritePlayer>("/favorites", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<void>(`/favorites/${id}`, { method: "DELETE" }),
  },

  notifications: {
    list: () => fetchAPI<Array<{ id: string; userId: string; title: string; description: string | null; type: string; read: boolean; createdAt: string }>>("/notifications"),
    markRead: (id: string) => fetchAPI<void>(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => fetchAPI<void>("/notifications/read-all", { method: "POST" }),
    clearAll: () => fetchAPI<void>("/notifications", { method: "DELETE" }),
  },

  notificationPreferences: {
    get: () => fetchAPI<NotificationPreferences>("/notification-preferences"),
    update: (data: Partial<NotificationPreferences>) => fetchAPI<NotificationPreferences>("/notification-preferences", { method: "PATCH", body: JSON.stringify(data) }),
  },

  settings: {
    get: () => fetchAPI<UserSettings & { notificationPreferences?: { system: boolean; training: boolean; billing: boolean } }>("/settings"),
    update: (data: SettingsUpdatePayload) => fetchAPI<UserSettings>("/settings", { method: "PATCH", body: JSON.stringify(data) }),
  },

  clash: {
    getPlayer: (tag: string) => fetchAPI<ClashPlayerData>(`/clash/player/${encodeURIComponent(tag)}`),
    getBattles: (tag: string) => fetchAPI<BattleRecord[]>(`/clash/player/${encodeURIComponent(tag)}/battles`),
    getCards: () => fetchAPI<Array<{ key: string; name: string; id: number; elixirCost: number; iconUrls?: { medium?: string } }>>("/clash/cards"),
  },

  player: {
    // The sync response is complex (PlayerSyncResponse) and typed at the consumer level.
    sync: () => fetchAPI<unknown>("/player/sync", { method: "POST" }),
    getSyncState: () => fetchAPI<unknown>("/player/sync-state"),

    // Story 2.4: Advanced stats endpoints
    stats: {
      cards: (options?: { season?: number }) => {
        const params = new URLSearchParams();
        if (typeof options?.season === "number") params.set("season", String(options.season));
        const query = params.toString();
        return fetchAPI<CardStatsResponse>(`/player/stats/cards${query ? `?${query}` : ""}`);
      },
      decks: (options?: { season?: number }) => {
        const params = new URLSearchParams();
        if (typeof options?.season === "number") params.set("season", String(options.season));
        const query = params.toString();
        return fetchAPI<DeckStatsResponse>(`/player/stats/decks${query ? `?${query}` : ""}`);
      },
      season: (options?: { season?: number }) => {
        const params = new URLSearchParams();
        if (typeof options?.season === "number") params.set("season", String(options.season));
        const query = params.toString();
        return fetchAPI<SeasonSummaryResponse>(`/player/stats/season${query ? `?${query}` : ""}`);
      },
      matchups: (deckHash: string) =>
        fetchAPI<MatchupsResponse>(`/player/stats/matchups?deck=${encodeURIComponent(deckHash)}`),
    },
  },

  history: {
    getBattles: (options?: { days?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (typeof options?.days === "number") params.set("days", String(options.days));
      if (typeof options?.limit === "number") params.set("limit", String(options.limit));
      const query = params.toString();
      return fetchAPI<BattleRecord[]>(`/history/battles${query ? `?${query}` : ""}`);
    },
  },

  coach: {
    chat: (
      messages: { role: "user" | "assistant" | "system"; content: string }[],
      playerTag?: string,
      contextType?: string,
    ) =>
      fetchAPI<{ message: string; timestamp: string; remainingMessages?: number | null }>("/coach/chat", {
        method: "POST",
        body: JSON.stringify({ messages, playerTag, contextType }),
      }),
    generatePushAnalysis: (playerTag?: string) =>
      fetchAPI<{
        id: string;
        summary: string;
        strengths: string[];
        mistakes: string[];
        recommendations: string[];
        wins: number;
        losses: number;
        winRate: number;
        netTrophies: number;
        battlesCount: number;
        pushStartTime: string;
        pushEndTime: string;
        durationMinutes?: number;
        tiltLevel?: "high" | "medium" | "none";
      }>("/coach/push-analysis", {
        method: "POST",
        body: JSON.stringify({ playerTag }),
      }),
    getLatestPushAnalysis: () =>
      fetchAPI<{
        id: string;
        summary: string;
        strengths: string[];
        mistakes: string[];
        recommendations: string[];
        wins: number;
        losses: number;
        winRate: number;
        netTrophies: number;
        battlesCount: number;
        pushStartTime: string;
        pushEndTime: string;
        durationMinutes?: number;
        tiltLevel?: "high" | "medium" | "none";
      } | null>("/coach/push-analysis/latest"),
    getMessages: (limit: number = 50) =>
      fetchAPI<{ id: string; role: "user" | "assistant" | "system"; content: string; timestamp: string | null }[]>(
        `/coach/messages?limit=${encodeURIComponent(String(limit))}`,
      ),
  },

  training: {
    getPlan: () => fetchAPI<TrainingPlanResponse | null>("/training/plan"),
    getPlans: () => fetchAPI<TrainingPlanResponse[]>("/training/plans"),
    generatePlan: (pushAnalysisId?: string) =>
      fetchAPI<TrainingPlanResponse>("/training/plan/generate", {
        method: "POST",
        body: JSON.stringify({ pushAnalysisId }),
      }),
    updateDrill: (drillId: string, data: { completedGames?: number; status?: string }) =>
      fetchAPI<TrainingDrillResponse>(`/training/drill/${drillId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updatePlan: (planId: string, data: { status: string }) =>
      fetchAPI<TrainingPlanResponse>(`/training/plan/${planId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  meta: {
    // Backwards-compatible alias (preferred: api.decks.getMetaDecks)
    getDecks: () => fetchAPI<MetaDeckData[]>("/meta/decks"),
  },

  decks: {
    getMetaDecks: (options?: { minTrophies?: number }) => {
      const params = new URLSearchParams();
      if (typeof options?.minTrophies === "number" && Number.isFinite(options.minTrophies)) {
        params.set("minTrophies", String(Math.floor(options.minTrophies)));
      }
      const query = params.toString();
      return fetchAPI<MetaDeckData[]>(`/decks/meta${query ? `?${query}` : ""}`);
    },
    getArenaMetaDecks: (arenaId: number) =>
      fetchAPI<ArenaMetaDeckData[]>(`/decks/meta/arena?arena=${encodeURIComponent(arenaId)}`),
    getCounterDecks: (card: string, arenaId: number) =>
      fetchAPI<CounterDecksResponse>(`/decks/counter?card=${encodeURIComponent(card)}&arena=${encodeURIComponent(arenaId)}`),
    generateCounter: (data: {
      targetCardKey: string;
      deckStyle?: "balanced" | "cycle" | "heavy";
      trophyRange?: { min: number; max: number } | null;
    }) =>
      fetchAPI<{ deck: { cards: string[]; avgElixir: number }; explanation: string; importLink: string }>(
        "/decks/builder/counter",
        { method: "POST", body: JSON.stringify(data) },
      ),
    optimize: (data: {
      currentDeck: string[];
      goal: "cycle" | "counter-card" | "consistency";
      targetCardKey?: string;
    }) =>
      fetchAPI<{
        originalDeck: { cards: string[]; avgElixir: number };
        suggestedDeck: { cards: string[]; avgElixir: number };
        changes: { from: string; to: string }[];
        explanation: string;
        importLink: string;
        metaContext?: { similarMetaDecks: { cards: string[]; winRateEstimate: number; games: number }[]; dataSource: string };
      }>("/decks/optimizer", { method: "POST", body: JSON.stringify(data) }),
  },

  community: {
    getPlayerRankings: (locationId: string = "global") =>
      fetchAPI<RankingResponse>(`/community/player-rankings?locationId=${encodeURIComponent(locationId)}`),
    getClanRankings: (locationId: string = "global") =>
      fetchAPI<RankingResponse>(`/community/clan-rankings?locationId=${encodeURIComponent(locationId)}`),
  },

  public: {
    // These endpoints return complex server-shaped data; consumers cast to page-level types.
    getPlayer: (tag: string) => fetchAPI<unknown>(`/public/player/${encodeURIComponent(tag)}`),
    getClan: (tag: string) => fetchAPI<unknown>(`/public/clan/${encodeURIComponent(tag)}`),
  },

  billing: {
    getInvoices: () => fetchAPI<InvoiceData[]>("/billing/invoices"),
  },

  stripe: {
    getConfig: () => fetchAPI<{ publishableKey: string }>("/stripe/config"),
    getProducts: () => fetchAPI<{ data: StripeProductWithPrices[] }>("/stripe/products"),
    getPrices: () => fetchAPI<{ data: Array<{ id: string; unit_amount: number | null; currency: string; recurring: { interval: string } | null; active: boolean }> }>("/stripe/prices"),
    getProductsWithPrices: () => fetchAPI<{ data: StripeProductWithPrices[] }>("/stripe/products-with-prices"),
    createCheckout: (priceId: string, currency?: string) =>
      fetchAPI<{ url: string }>("/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId, currency }),
      }),
    createPortal: () =>
      fetchAPI<{ url: string }>("/stripe/portal", {
        method: "POST",
      }),
  },
};
