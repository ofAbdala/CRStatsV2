/**
 * Shared types for the Settings feature.
 *
 * Extracted from the original settings.tsx (Story 1.10, TD-023).
 */

import type { Profile, Subscription, FavoritePlayer, User } from "@shared/schema";
import type { UserSettingsResponse } from "@/hooks/useSettings";

// ── Clash Royale player data (from /api/clash/player/:tag) ──────────────

export interface ClashPlayerData {
  name: string;
  tag: string;
  trophies: number;
  bestTrophies?: number;
  arena?: { id: number; name: string };
  clan?: { name: string; tag: string; badgeId?: number };
}

// ── Invoice data (from /api/billing/invoices) ───────────────────────────

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

// ── Subscription data (from /api/subscription) ─────────────────────────

export interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd?: string | null;
}

// ── Settings update payload ─────────────────────────────────────────────

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

// ── Re-exports for convenience ──────────────────────────────────────────

export type { Profile, Subscription, FavoritePlayer, User, UserSettingsResponse };
