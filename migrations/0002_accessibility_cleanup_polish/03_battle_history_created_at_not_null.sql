-- Migration: Add NOT NULL constraint to battle_history.created_at (TD-053)
-- Story 1.12, AC8
--
-- Pre-check: Ensure no NULL values exist before applying constraint
-- If any NULLs are found, set them to the battle_time value as a fallback.

UPDATE battle_history
SET created_at = COALESCE(created_at, battle_time, now())
WHERE created_at IS NULL;

ALTER TABLE battle_history ALTER COLUMN created_at SET NOT NULL;
