-- Migration: Convert all timestamp columns to timestamptz (TD-036)
-- Story 1.12, AC5
--
-- All timestamp columns across all tables are converted from
-- timestamp (without timezone) to timestamptz (with timezone).
-- In PostgreSQL this is a metadata-only change (no table rewrite)
-- when there is no default expression change.

-- users
ALTER TABLE users ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE users ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- profiles
ALTER TABLE profiles ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE profiles ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- subscriptions
ALTER TABLE subscriptions ALTER COLUMN current_period_end TYPE timestamptz USING current_period_end AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- goals
ALTER TABLE goals ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';
ALTER TABLE goals ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE goals ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- favorite_players
ALTER TABLE favorite_players ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- notifications
ALTER TABLE notifications ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- user_settings
ALTER TABLE user_settings ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_settings ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- notification_preferences
ALTER TABLE notification_preferences ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE notification_preferences ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- player_sync_state
ALTER TABLE player_sync_state ALTER COLUMN last_synced_at TYPE timestamptz USING last_synced_at AT TIME ZONE 'UTC';
ALTER TABLE player_sync_state ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- battle_history
ALTER TABLE battle_history ALTER COLUMN battle_time TYPE timestamptz USING battle_time AT TIME ZONE 'UTC';
ALTER TABLE battle_history ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- coach_messages
ALTER TABLE coach_messages ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- push_analyses
ALTER TABLE push_analyses ALTER COLUMN push_start_time TYPE timestamptz USING push_start_time AT TIME ZONE 'UTC';
ALTER TABLE push_analyses ALTER COLUMN push_end_time TYPE timestamptz USING push_end_time AT TIME ZONE 'UTC';
ALTER TABLE push_analyses ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- training_plans
ALTER TABLE training_plans ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE training_plans ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- training_drills
ALTER TABLE training_drills ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE training_drills ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- meta_decks_cache
ALTER TABLE meta_decks_cache ALTER COLUMN last_updated_at TYPE timestamptz USING last_updated_at AT TIME ZONE 'UTC';

-- deck_suggestions_usage
ALTER TABLE deck_suggestions_usage ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
