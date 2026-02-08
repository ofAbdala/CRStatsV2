// API client utilities for CRStats

const API_BASE = "/api";

type ApiErrorDetail = { path?: string; message?: string; code?: string } | unknown;

interface ApiErrorResponse {
  code?: string;
  message?: string;
  error?: string;
  details?: ApiErrorDetail[] | ApiErrorDetail;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetail[] | ApiErrorDetail;

  constructor({
    status,
    message,
    code,
    details,
  }: {
    status: number;
    message: string;
    code?: string;
    details?: ApiErrorDetail[] | ApiErrorDetail;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
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
  const baseMessage = payload.message || payload.error || `HTTP ${status}`;
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
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    throw new ApiError({
      status: response.status,
      code: payload.code,
      details: payload.details,
      message: buildErrorMessage(response.status, payload),
    });
  }

  return response.json();
}

export const api = {
  auth: {
    getUser: () => fetchAPI("/auth/user"),
  },

  profile: {
    get: () => fetchAPI("/profile"),
    create: (data: any) => fetchAPI("/profile", { method: "POST", body: JSON.stringify(data) }),
    update: (data: any) => fetchAPI("/profile", { method: "PATCH", body: JSON.stringify(data) }),
  },

  subscription: {
    get: () => fetchAPI("/subscription"),
  },

  goals: {
    list: () => fetchAPI("/goals"),
    create: (data: any) => fetchAPI("/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/goals/${id}`, { method: "DELETE" }),
  },

  favorites: {
    list: () => fetchAPI("/favorites"),
    create: (data: any) => fetchAPI("/favorites", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/favorites/${id}`, { method: "DELETE" }),
  },

  notifications: {
    list: () => fetchAPI("/notifications"),
    markRead: (id: string) => fetchAPI(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => fetchAPI("/notifications/read-all", { method: "POST" }),
  },

  notificationPreferences: {
    get: () => fetchAPI("/notification-preferences"),
    update: (data: any) => fetchAPI("/notification-preferences", { method: "PATCH", body: JSON.stringify(data) }),
  },

  settings: {
    get: () => fetchAPI("/settings"),
    update: (data: any) => fetchAPI("/settings", { method: "PATCH", body: JSON.stringify(data) }),
  },

  clash: {
    getPlayer: (tag: string) => fetchAPI(`/clash/player/${encodeURIComponent(tag)}`),
    getBattles: (tag: string) => fetchAPI(`/clash/player/${encodeURIComponent(tag)}/battles`),
    getCards: () => fetchAPI("/clash/cards"),
  },

  player: {
    sync: () => fetchAPI("/player/sync", { method: "POST" }),
    getSyncState: () => fetchAPI("/player/sync-state"),
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
  },

  training: {
    getPlan: () => fetchAPI<any>("/training/plan"),
    getPlans: () => fetchAPI<any[]>("/training/plans"),
    generatePlan: (pushAnalysisId?: string) =>
      fetchAPI<any>("/training/plan/generate", {
        method: "POST",
        body: JSON.stringify({ pushAnalysisId }),
      }),
    updateDrill: (drillId: string, data: { completedGames?: number; status?: string }) =>
      fetchAPI<any>(`/training/drill/${drillId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updatePlan: (planId: string, data: { status: string }) =>
      fetchAPI<any>(`/training/plan/${planId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  meta: {
    getDecks: () => fetchAPI<any[]>("/meta/decks"),
  },

  community: {
    getPlayerRankings: (locationId: string = "global") =>
      fetchAPI<any>(`/community/player-rankings?locationId=${encodeURIComponent(locationId)}`),
    getClanRankings: (locationId: string = "global") =>
      fetchAPI<any>(`/community/clan-rankings?locationId=${encodeURIComponent(locationId)}`),
  },

  public: {
    getPlayer: (tag: string) => fetchAPI<any>(`/public/player/${encodeURIComponent(tag)}`),
    getClan: (tag: string) => fetchAPI<any>(`/public/clan/${encodeURIComponent(tag)}`),
  },

  billing: {
    getInvoices: () => fetchAPI<any[]>("/billing/invoices"),
  },

  stripe: {
    getConfig: () => fetchAPI<{ publishableKey: string }>("/stripe/config"),
    getProducts: () => fetchAPI<{ data: any[] }>("/stripe/products"),
    getPrices: () => fetchAPI<{ data: any[] }>("/stripe/prices"),
    getProductsWithPrices: () => fetchAPI<{ data: any[] }>("/stripe/products-with-prices"),
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
