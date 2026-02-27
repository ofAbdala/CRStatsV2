-- Migration: Deprecate clash_tag column (TD-041)
-- Story 1.12, AC6
--
-- Step 1: Copy any clash_tag values to default_player_tag where default_player_tag is NULL
-- Step 2: Rename clash_tag to _clash_tag_deprecated
--
-- Application code already uses default_player_tag as the canonical field.
-- The buildCanonicalProfileData() function in storage.ts synced both columns.
-- After this migration, only default_player_tag is used.

-- Ensure no data is lost: copy clash_tag -> default_player_tag where needed
UPDATE profiles
SET default_player_tag = clash_tag
WHERE default_player_tag IS NULL AND clash_tag IS NOT NULL;

-- Rename the column to mark it deprecated
ALTER TABLE profiles RENAME COLUMN clash_tag TO _clash_tag_deprecated;
