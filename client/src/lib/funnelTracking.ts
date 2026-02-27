/**
 * Client-side conversion funnel tracking (Story 2.6, AC9).
 *
 * Tracks the user journey: page_view -> signup -> first_query -> limit_hit ->
 * pricing_view -> checkout_start -> payment_complete.
 *
 * Currently logs events to console in development and stores them in
 * sessionStorage for basic analytics. Can be extended with a real
 * analytics provider later.
 */

export type FunnelEvent =
  | "page_view"
  | "signup"
  | "first_query"
  | "limit_hit"
  | "paywall_shown"
  | "paywall_dismissed"
  | "pricing_view"
  | "checkout_start"
  | "payment_complete"
  | "upgrade_prompt_shown"
  | "upgrade_prompt_clicked"
  | "upgrade_prompt_dismissed";

interface FunnelEventData {
  event: FunnelEvent;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = "crstats_funnel_events";
const MAX_STORED_EVENTS = 100;

function getStoredEvents(): FunnelEventData[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeEvent(eventData: FunnelEventData): void {
  try {
    const events = getStoredEvents();
    events.push(eventData);
    // Keep only the last N events to avoid unbounded storage growth
    const trimmed = events.slice(-MAX_STORED_EVENTS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // sessionStorage not available (SSR, private browsing edge cases)
  }
}

/**
 * Track a funnel event.
 *
 * @param event - The funnel event name
 * @param properties - Optional key-value properties for the event
 */
export function trackFunnelEvent(
  event: FunnelEvent,
  properties?: Record<string, string | number | boolean>,
): void {
  const eventData: FunnelEventData = {
    event,
    timestamp: new Date().toISOString(),
    properties,
  };

  // Store in session
  storeEvent(eventData);

  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Funnel] ${event}`, properties || "");
  }
}

/**
 * Get all tracked funnel events for the current session.
 * Useful for debugging or sending to an analytics endpoint.
 */
export function getFunnelEvents(): FunnelEventData[] {
  return getStoredEvents();
}
