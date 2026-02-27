/**
 * Centralized free-tier usage limits.
 *
 * These constants define the daily caps for free-plan users across the
 * application. Keeping them in one place avoids magic numbers scattered
 * throughout route handlers and makes plan-related changes atomic.
 */

/** Maximum number of coach chat messages a free user can send per day. */
export const FREE_DAILY_LIMIT = 5;

/** Maximum number of deck suggestion requests (counter or optimizer) a free user can make per day. */
export const FREE_DECK_SUGGESTION_DAILY_LIMIT = 2;
