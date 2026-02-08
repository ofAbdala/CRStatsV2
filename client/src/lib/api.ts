// API client utilities for CRStats

const API_BASE = '/api';

interface ApiErrorResponse {
  code?: string;
  message?: string;
  error?: string;
  details?: Array<{ path?: string; message?: string }> | unknown;
}

function formatApiError(status: number, payload: ApiErrorResponse): string {
  const baseMessage = payload.message || payload.error || `HTTP ${status}`;

  if (Array.isArray(payload.details) && payload.details.length > 0) {
    const details = payload.details
      .map((item: any) => {
        const path = item?.path ? `${item.path}: ` : "";
        return `${path}${item?.message || "Invalid field"}`;
      })
      .join("; ");

    return payload.code ? `[${payload.code}] ${baseMessage} - ${details}` : `${baseMessage} - ${details}`;
  }

  return payload.code ? `[${payload.code}] ${baseMessage}` : baseMessage;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ message: 'Request failed' } as ApiErrorResponse));

    throw new Error(formatApiError(response.status, errorPayload));
  }

  return response.json();
}

export const api = {
  // Auth endpoints
  auth: {
    getUser: () => fetchAPI('/auth/user'),
  },

  // Profile endpoints
  profile: {
    get: () => fetchAPI('/profile'),
    create: (data: any) => fetchAPI('/profile', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: any) => fetchAPI('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Subscription endpoints
  subscription: {
    get: () => fetchAPI('/subscription'),
  },

  // Goals endpoints
  goals: {
    list: () => fetchAPI('/goals'),
    create: (data: any) => fetchAPI('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/goals/${id}`, { method: 'DELETE' }),
  },

  // Favorites endpoints
  favorites: {
    list: () => fetchAPI('/favorites'),
    create: (data: any) => fetchAPI('/favorites', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/favorites/${id}`, { method: 'DELETE' }),
  },

  // Notifications endpoints
  notifications: {
    list: () => fetchAPI('/notifications'),
    markRead: (id: string) => fetchAPI(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => fetchAPI('/notifications/read-all', { method: 'POST' }),
  },

  // Notification preferences endpoints
  notificationPreferences: {
    get: () => fetchAPI('/notification-preferences'),
    update: (data: any) => fetchAPI('/notification-preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Settings endpoints
  settings: {
    get: () => fetchAPI('/settings'),
    update: (data: any) => fetchAPI('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Clash Royale API endpoints
  clash: {
    getPlayer: (tag: string) => fetchAPI(`/clash/player/${encodeURIComponent(tag)}`),
    getBattles: (tag: string) => fetchAPI(`/clash/player/${encodeURIComponent(tag)}/battles`),
    getCards: () => fetchAPI('/clash/cards'),
  },

  // Player sync endpoints
  player: {
    sync: () => fetchAPI('/player/sync', { method: 'POST' }),
    getSyncState: () => fetchAPI('/player/sync-state'),
  },

  // AI Coach endpoints
  coach: {
    chat: (messages: { role: string; content: string }[], playerTag?: string) =>
      fetchAPI<{ message: string; timestamp: string }>('/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, playerTag }),
      }),
  },

  // Stripe billing endpoints
  stripe: {
    getConfig: () => fetchAPI<{ publishableKey: string }>('/stripe/config'),
    getProducts: () => fetchAPI<{ data: any[] }>('/stripe/products'),
    getPrices: () => fetchAPI<{ data: any[] }>('/stripe/prices'),
    getProductsWithPrices: () => fetchAPI<{ data: any[] }>('/stripe/products-with-prices'),
    createCheckout: (priceId: string, currency?: string) =>
      fetchAPI<{ url: string }>('/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId, currency }),
      }),
    createPortal: () =>
      fetchAPI<{ url: string }>('/stripe/portal', {
        method: 'POST',
      }),
  },
};
