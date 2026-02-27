/**
 * Centralized free-tier usage limits.
 *
 * These constants define the daily caps for free-plan users across the
 * application. Keeping them in one place avoids magic numbers scattered
 * throughout route handlers and makes plan-related changes atomic.
 */

import type { SubscriptionTier } from '../pricing';

/** Maximum number of coach chat messages a free user can send per day. */
export const FREE_DAILY_LIMIT = 5;

/** Maximum number of deck suggestion requests (counter or optimizer) a free user can make per day. */
export const FREE_DECK_SUGGESTION_DAILY_LIMIT = 5;

/** Maximum number of meta/counter deck queries a free user can make per day. */
export const FREE_META_QUERY_DAILY_LIMIT = 5;

/** Maximum number of deck optimizer requests a free user can make per day. */
export const FREE_OPTIMIZER_DAILY_LIMIT = 5;

// ── Feature gating matrix per tier ──────────────────────────────────────────

export interface TierLimits {
  metaQueries: number;       // 0 = unlimited
  counterQueries: number;    // 0 = unlimited
  coachMessages: number;     // 0 = unlimited
  optimizerQueries: number;  // 0 = unlimited
  pushAnalysis: boolean;
  trainingPlans: boolean;
  advancedAnalytics: boolean;
  detailedMatchups: boolean;
  priorityCoaching: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    metaQueries: 5,
    counterQueries: 5,
    coachMessages: 5,
    optimizerQueries: 5,
    pushAnalysis: false,
    trainingPlans: false,
    advancedAnalytics: false,
    detailedMatchups: false,
    priorityCoaching: false,
  },
  pro: {
    metaQueries: 0,       // unlimited
    counterQueries: 0,    // unlimited
    coachMessages: 0,     // unlimited
    optimizerQueries: 0,  // unlimited
    pushAnalysis: true,
    trainingPlans: false,
    advancedAnalytics: false,
    detailedMatchups: false,
    priorityCoaching: false,
  },
  elite: {
    metaQueries: 0,       // unlimited
    counterQueries: 0,    // unlimited
    coachMessages: 0,     // unlimited
    optimizerQueries: 0,  // unlimited
    pushAnalysis: true,
    trainingPlans: true,
    advancedAnalytics: true,
    detailedMatchups: true,
    priorityCoaching: true,
  },
};

/** Returns the limits for a given tier, defaulting to free. */
export function getTierLimits(tier: string | null | undefined): TierLimits {
  if (tier === 'pro') return TIER_LIMITS.pro;
  if (tier === 'elite') return TIER_LIMITS.elite;
  return TIER_LIMITS.free;
}

/** Returns true if the given daily limit means "unlimited" (0 = unlimited). */
export function isUnlimited(limit: number): boolean {
  return limit === 0;
}
