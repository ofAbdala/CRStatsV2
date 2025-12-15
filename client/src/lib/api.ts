// API client utilities for CRStats

const API_BASE = '/api';

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
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
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

  // AI Coach endpoints
  coach: {
    chat: (messages: { role: string; content: string }[], playerTag?: string) =>
      fetchAPI<{ message: string; timestamp: string; remainingMessages?: number }>('/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, playerTag }),
      }),
    analyzePush: (playerTag?: string) =>
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
      }>('/coach/push-analysis', {
        method: 'POST',
        body: JSON.stringify({ playerTag }),
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
