-- ============================================================================
-- PRE-CHECK: Verify no existing rows violate the constraints (AC15)
-- Run these queries BEFORE applying the migration. If any return rows,
-- fix the data first.
-- ============================================================================

-- 1. Check for invalid subscription plans
SELECT id, user_id, plan FROM public.subscriptions
WHERE plan NOT IN ('free', 'pro');

-- 2. Check for invalid subscription statuses
SELECT id, user_id, status FROM public.subscriptions
WHERE status NOT IN ('inactive', 'active', 'canceled', 'past_due');

-- 3. Check for invalid goal types
SELECT id, user_id, type FROM public.goals
WHERE type NOT IN ('trophies', 'streak', 'winrate', 'custom');

-- 4. Check for invalid training plan statuses
SELECT id, user_id, status FROM public.training_plans
WHERE status NOT IN ('active', 'archived', 'completed');

-- 5. Check for invalid training drill statuses
SELECT id, plan_id, status FROM public.training_drills
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'skipped');

-- 6. Check for duplicate subscription rows per user (TD-015 AC2)
SELECT user_id, count(*) as cnt
FROM public.subscriptions
GROUP BY user_id
HAVING count(*) > 1;
