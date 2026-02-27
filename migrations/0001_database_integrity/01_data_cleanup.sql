-- ============================================================================
-- DATA CLEANUP: Run BEFORE applying schema constraints
-- REQUIRES: Full database backup + PITR verified
-- ============================================================================

-- TD-015 (AC2): Clean up duplicate subscription rows.
-- Strategy: keep the row with plan = 'pro' (if any), then the most recent created_at.
-- All other duplicates are deleted.
WITH ranked AS (
  SELECT
    id,
    user_id,
    plan,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN plan = 'pro' THEN 0 ELSE 1 END,
        created_at DESC
    ) AS rn
  FROM public.subscriptions
)
DELETE FROM public.subscriptions
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- TD-012 (AC6): Migrate notification data from user_settings to notification_preferences.
-- For each user, preserve notification_preferences values where they exist;
-- use user_settings values as fallback only where notification_preferences has no row.
INSERT INTO public.notification_preferences (user_id, training, billing, system, created_at, updated_at)
SELECT
  us.user_id,
  COALESCE(us.notifications_training, true),
  COALESCE(us.notifications_billing, true),
  COALESCE(us.notifications_system, true),
  now(),
  now()
FROM public.user_settings us
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np WHERE np.user_id = us.user_id
)
AND (
  us.notifications_training IS NOT NULL
  OR us.notifications_billing IS NOT NULL
  OR us.notifications_system IS NOT NULL
);
