-- ============================================================================
-- SCHEMA CHANGES: Story 1.5 -- Database Integrity
-- Covers TD-015, TD-012, TD-026
-- REQUIRES: 01_data_cleanup.sql must be run first
-- ============================================================================

-- TD-015 (AC1): Add UNIQUE constraint on subscriptions.user_id
-- First drop the old non-unique index
DROP INDEX IF EXISTS "IDX_subscriptions_user_id";

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "UIDX_subscriptions_user_id"
  ON public.subscriptions(user_id);

-- TD-026 (AC14): CHECK constraints on enum columns
ALTER TABLE public.subscriptions
  ADD CONSTRAINT chk_subscriptions_plan
  CHECK (plan IN ('free', 'pro'));

ALTER TABLE public.subscriptions
  ADD CONSTRAINT chk_subscriptions_status
  CHECK (status IN ('inactive', 'active', 'canceled', 'past_due'));

ALTER TABLE public.goals
  ADD CONSTRAINT chk_goals_type
  CHECK (type IN ('trophies', 'streak', 'winrate', 'custom'));

ALTER TABLE public.training_plans
  ADD CONSTRAINT chk_training_plans_status
  CHECK (status IN ('active', 'archived', 'completed'));

ALTER TABLE public.training_drills
  ADD CONSTRAINT chk_training_drills_status
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- TD-012 (AC5): Remove notification columns from user_settings
-- (data has already been migrated to notification_preferences in step 01)
ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS notifications_training;

ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS notifications_billing;

ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS notifications_system;
