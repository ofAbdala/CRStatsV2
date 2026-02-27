-- Migration: Standardize index naming convention (TD-048)
-- Story 1.12, AC7
--
-- All indexes are renamed from IDX_/UIDX_ uppercase prefix to
-- lowercase idx_/uidx_ convention: idx_table_columns

-- subscriptions
ALTER INDEX "UIDX_subscriptions_user_id" RENAME TO "uidx_subscriptions_user_id";

-- goals
ALTER INDEX "IDX_goals_user_id" RENAME TO "idx_goals_user_id";

-- favorite_players
ALTER INDEX "IDX_favorite_players_user_id" RENAME TO "idx_favorite_players_user_id";
ALTER INDEX "UIDX_favorite_players_user_id_player_tag" RENAME TO "uidx_favorite_players_user_id_player_tag";

-- notifications
ALTER INDEX "IDX_notifications_user_id" RENAME TO "idx_notifications_user_id";

-- battle_history
ALTER INDEX "IDX_battle_history_user_tag_time" RENAME TO "idx_battle_history_user_tag_time";

-- coach_messages
ALTER INDEX "IDX_coach_messages_user_id" RENAME TO "idx_coach_messages_user_id";
-- idx_coach_messages_user_role_created is already lowercase -- no change needed

-- push_analyses
ALTER INDEX "IDX_push_analyses_user_id" RENAME TO "idx_push_analyses_user_id";
-- idx_push_analyses_user_created is already lowercase -- no change needed

-- training_plans
ALTER INDEX "IDX_training_plans_user_id" RENAME TO "idx_training_plans_user_id";

-- training_drills
ALTER INDEX "IDX_training_drills_plan_id" RENAME TO "idx_training_drills_plan_id";

-- deck_suggestions_usage
ALTER INDEX "IDX_deck_suggestions_usage_user_type_created" RENAME TO "idx_deck_suggestions_usage_user_type_created";
