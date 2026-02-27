import { sql, relations } from "drizzle-orm";
import {
  check,
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  real,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTH TABLES
// ============================================================================

export const users = pgTable("users", {
  // Supabase Auth owns the source of truth for the user id (auth.users.id).
  // Store it as a uuid-string to keep the rest of the app schema unchanged.
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// PROFILES TABLE
// ============================================================================

export const profiles = pgTable("profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name"),
  /** @deprecated Use defaultPlayerTag. Column renamed to _clash_tag_deprecated in migration 0002. */
  clashTag: varchar("_clash_tag_deprecated"),
  defaultPlayerTag: varchar("default_player_tag"),
  region: varchar("region").default("BR"),
  language: varchar("language").default("pt"),
  role: varchar("role").default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// ============================================================================
// SUBSCRIPTIONS TABLE
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id"),
    stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
    plan: varchar("plan").notNull().default("free"),
    status: varchar("status").notNull().default("inactive"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uidx_subscriptions_user_id").on(table.userId),
    check("chk_subscriptions_plan", sql`${table.plan} IN ('free', 'pro')`),
    check("chk_subscriptions_status", sql`${table.status} IN ('inactive', 'active', 'canceled', 'past_due')`),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ============================================================================
// GOALS TABLE
// ============================================================================

export const goals = pgTable(
  "goals",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: varchar("type").notNull(),
    targetValue: integer("target_value").notNull(),
    currentValue: integer("current_value").default(0),
    completed: boolean("completed").default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_goals_user_id").on(table.userId),
    check("chk_goals_type", sql`${table.type} IN ('trophies', 'streak', 'winrate', 'custom')`),
  ],
);

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// ============================================================================
// FAVORITE PLAYERS TABLE
// ============================================================================

export const favoritePlayers = pgTable(
  "favorite_players",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    playerTag: varchar("player_tag").notNull(),
    name: varchar("name").notNull(),
    trophies: integer("trophies"),
    clan: varchar("clan"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_favorite_players_user_id").on(table.userId),
    uniqueIndex("uidx_favorite_players_user_id_player_tag").on(table.userId, table.playerTag),
  ],
);

export const insertFavoritePlayerSchema = createInsertSchema(favoritePlayers).omit({
  id: true,
  createdAt: true,
});
export type InsertFavoritePlayer = z.infer<typeof insertFavoritePlayerSchema>;
export type FavoritePlayer = typeof favoritePlayers.$inferSelect;

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: varchar("type").notNull(),
    read: boolean("read").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_notifications_user_id").on(table.userId)],
);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================================================
// USER SETTINGS TABLE
// ============================================================================

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme").default("dark"),
  preferredLanguage: varchar("preferred_language").default("pt"),
  defaultLandingPage: varchar("default_landing_page").default("dashboard"),
  showAdvancedStats: boolean("show_advanced_stats").default(false),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ============================================================================
// NOTIFICATION PREFERENCES TABLE
// ============================================================================

export const notificationPreferences = pgTable("notification_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  training: boolean("training").notNull().default(true),
  billing: boolean("billing").notNull().default(true),
  system: boolean("system").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// ============================================================================
// PLAYER SYNC STATE TABLE
// ============================================================================

export const playerSyncState = pgTable("player_sync_state", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPlayerSyncStateSchema = createInsertSchema(playerSyncState).omit({
  updatedAt: true,
});
export type InsertPlayerSyncState = z.infer<typeof insertPlayerSyncStateSchema>;
export type PlayerSyncState = typeof playerSyncState.$inferSelect;

// ============================================================================
// BATTLE HISTORY TABLE
// ============================================================================

export const battleHistory = pgTable(
  "battle_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    playerTag: varchar("player_tag").notNull(),
    battleTime: timestamp("battle_time", { withTimezone: true }).notNull(),
    battleKey: varchar("battle_key").notNull().unique(),
    battleJson: jsonb("battle_json").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_battle_history_user_tag_time").on(table.userId, table.playerTag, table.battleTime)],
);

export const insertBattleHistorySchema = createInsertSchema(battleHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertBattleHistory = z.infer<typeof insertBattleHistorySchema>;
export type BattleHistory = typeof battleHistory.$inferSelect;

// ============================================================================
// COACH MESSAGES TABLE
// ============================================================================

export const coachMessages = pgTable(
  "coach_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role").notNull(),
    content: text("content").notNull(),
    contextType: varchar("context_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_coach_messages_user_id").on(table.userId),
    index("idx_coach_messages_user_role_created").on(table.userId, table.role, table.createdAt),
  ],
);

export const insertCoachMessageSchema = createInsertSchema(coachMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertCoachMessage = z.infer<typeof insertCoachMessageSchema>;
export type CoachMessage = typeof coachMessages.$inferSelect;

// ============================================================================
// PUSH ANALYSES TABLE
// ============================================================================

export const pushAnalyses = pgTable(
  "push_analyses",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pushStartTime: timestamp("push_start_time", { withTimezone: true }).notNull(),
    pushEndTime: timestamp("push_end_time", { withTimezone: true }).notNull(),
    battlesCount: integer("battles_count").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    netTrophies: integer("net_trophies").notNull(),
    resultJson: jsonb("result_json").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_push_analyses_user_id").on(table.userId),
    index("idx_push_analyses_user_created").on(table.userId, table.createdAt),
  ],
);

export const insertPushAnalysisSchema = createInsertSchema(pushAnalyses).omit({
  id: true,
  createdAt: true,
});
export type InsertPushAnalysis = z.infer<typeof insertPushAnalysisSchema>;
export type PushAnalysis = typeof pushAnalyses.$inferSelect;

// ============================================================================
// TRAINING PLANS TABLE
// ============================================================================

export const trainingPlans = pgTable(
  "training_plans",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title").notNull(),
    source: varchar("source").notNull().default("manual"),
    status: varchar("status").notNull().default("active"),
    pushAnalysisId: varchar("push_analysis_id").references(() => pushAnalyses.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_training_plans_user_id").on(table.userId),
    check("chk_training_plans_status", sql`${table.status} IN ('active', 'archived', 'completed')`),
  ],
);

export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;
export type TrainingPlan = typeof trainingPlans.$inferSelect;

// ============================================================================
// TRAINING DRILLS TABLE
// ============================================================================

export const trainingDrills = pgTable(
  "training_drills",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
    focusArea: varchar("focus_area").notNull(),
    description: text("description").notNull(),
    targetGames: integer("target_games").notNull(),
    completedGames: integer("completed_games").notNull().default(0),
    mode: varchar("mode").notNull(),
    priority: integer("priority").notNull().default(1),
    status: varchar("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_training_drills_plan_id").on(table.planId),
    check("chk_training_drills_status", sql`${table.status} IN ('pending', 'in_progress', 'completed', 'skipped')`),
  ],
);

export const insertTrainingDrillSchema = createInsertSchema(trainingDrills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingDrill = z.infer<typeof insertTrainingDrillSchema>;
export type TrainingDrill = typeof trainingDrills.$inferSelect;

// ============================================================================
// META DECK CACHE TABLE
// ============================================================================

export const metaDecksCache = pgTable("meta_decks_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deckHash: varchar("deck_hash").notNull().unique(),
  cards: jsonb("cards").notNull().$type<string[]>(),
  // NOTE: usageCount is treated as "games" in deck/meta APIs (kept for backwards compatibility).
  usageCount: integer("usage_count").notNull().default(0),
  avgTrophies: integer("avg_trophies"),
  archetype: varchar("archetype"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  avgElixir: real("avg_elixir"),
  winRateEstimate: real("win_rate_estimate"),
  sourceRegion: varchar("source_region"),
  sourceRange: varchar("source_range"),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow(),
});

export const insertMetaDeckCacheSchema = createInsertSchema(metaDecksCache).omit({
  id: true,
});
export type InsertMetaDeckCache = z.infer<typeof insertMetaDeckCacheSchema>;
export type MetaDeckCache = typeof metaDecksCache.$inferSelect;

// ============================================================================
// DECK SUGGESTIONS USAGE (FREE LIMITS)
// ============================================================================

export const deckSuggestionsUsage = pgTable(
  "deck_suggestions_usage",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    suggestionType: varchar("suggestion_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_deck_suggestions_usage_user_type_created").on(
      table.userId,
      table.suggestionType,
      table.createdAt,
    ),
  ],
);

export const insertDeckSuggestionsUsageSchema = createInsertSchema(deckSuggestionsUsage).omit({
  id: true,
  createdAt: true,
});
export type InsertDeckSuggestionsUsage = z.infer<typeof insertDeckSuggestionsUsageSchema>;
export type DeckSuggestionsUsage = typeof deckSuggestionsUsage.$inferSelect;

// ============================================================================
// REQUEST ZOD SCHEMAS FOR ROUTES
// ============================================================================

const normalizedTagSchema = z
  .string()
  .trim()
  .min(3)
  .max(16)
  .regex(/^#?[A-Za-z0-9]+$/, "Invalid Clash Royale tag")
  .transform((value) => {
    const withoutHash = value.replace(/^#/, "").toUpperCase();
    return `#${withoutHash}`;
  });

const nullableTagSchema = z.union([normalizedTagSchema, z.null()]);

export const profileCreateInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  /** @deprecated Use defaultPlayerTag instead. Kept for backwards compatibility during transition. */
  clashTag: nullableTagSchema.optional(),
  defaultPlayerTag: nullableTagSchema.optional(),
  region: z.string().trim().min(2).max(10).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export const profileUpdateInputSchema = profileCreateInputSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one profile field is required",
  });

export const settingsNotificationCategoriesSchema = z.object({
  training: z.boolean().optional(),
  billing: z.boolean().optional(),
  system: z.boolean().optional(),
});

export const settingsUpdateInputSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    preferredLanguage: z.string().trim().min(2).max(10).optional(),
    defaultLandingPage: z.enum(["dashboard", "community", "goals", "coach"]).optional(),
    showAdvancedStats: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    notificationPreferences: settingsNotificationCategoriesSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one settings field is required",
  });

export const notificationPreferencesUpdateInputSchema = settingsNotificationCategoriesSchema.refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "At least one notification preference is required" },
);

export const playerSyncRequestSchema = z.object({}).strict();

export const counterDeckRequestSchema = z
  .object({
    targetCardKey: z.string().trim().min(1).max(80),
    deckStyle: z.enum(["balanced", "cycle", "heavy"]).optional(),
    trophyRange: z
      .object({
        min: z.number().int().nonnegative(),
        max: z.number().int().nonnegative(),
      })
      .nullable()
      .optional(),
  })
  .strict();

export const deckOptimizerRequestSchema = z
  .object({
    currentDeck: z.array(z.string().trim().min(1).max(80)).length(8),
    goal: z.enum(["cycle", "counter-card", "consistency"]),
    targetCardKey: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.goal === "counter-card" && !payload.targetCardKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetCardKey"],
        message: "targetCardKey is required when goal is counter-card",
      });
    }
  });

export const goalCreateInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["trophies", "streak", "winrate", "custom"]),
  targetValue: z.number().int().nonnegative(),
  currentValue: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional(),
  completedAt: z.coerce.date().optional(),
});

export const goalUpdateInputSchema = goalCreateInputSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "At least one goal field is required" },
);

export const favoriteCreateInputSchema = z.object({
  playerTag: normalizedTagSchema,
  name: z.string().trim().min(1).max(80),
  trophies: z.number().int().nonnegative().optional(),
  clan: z.string().trim().max(80).optional(),
  setAsDefault: z.boolean().optional(),
});

export const coachChatInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1),
      }),
    )
    .min(1),
  playerTag: normalizedTagSchema.optional(),
  contextType: z.string().trim().max(50).optional(),
});

export const trainingDrillUpdateInputSchema = z
  .object({
    completedGames: z.number().int().nonnegative().optional(),
    status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one drill field is required",
  });

export const trainingPlanUpdateInputSchema = z.object({
  status: z.enum(["active", "archived", "completed"]),
});

export type ProfileCreateInput = z.infer<typeof profileCreateInputSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateInputSchema>;
export type NotificationPreferencesUpdateInput = z.infer<typeof notificationPreferencesUpdateInputSchema>;
export type GoalCreateInput = z.infer<typeof goalCreateInputSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateInputSchema>;
export type FavoriteCreateInput = z.infer<typeof favoriteCreateInputSchema>;
export type CoachChatInput = z.infer<typeof coachChatInputSchema>;
export type TrainingDrillUpdateInput = z.infer<typeof trainingDrillUpdateInputSchema>;
export type TrainingPlanUpdateInput = z.infer<typeof trainingPlanUpdateInputSchema>;
export type PlayerSyncRequestInput = z.infer<typeof playerSyncRequestSchema>;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  goals: many(goals),
  favoritePlayers: many(favoritePlayers),
  notifications: many(notifications),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  notificationPreferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  syncState: one(playerSyncState, {
    fields: [users.id],
    references: [playerSyncState.userId],
  }),
  battleHistory: many(battleHistory),
  coachMessages: many(coachMessages),
  pushAnalyses: many(pushAnalyses),
  trainingPlans: many(trainingPlans),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const favoritePlayersRelations = relations(favoritePlayers, ({ one }) => ({
  user: one(users, {
    fields: [favoritePlayers.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const playerSyncStateRelations = relations(playerSyncState, ({ one }) => ({
  user: one(users, {
    fields: [playerSyncState.userId],
    references: [users.id],
  }),
}));

export const coachMessagesRelations = relations(coachMessages, ({ one }) => ({
  user: one(users, {
    fields: [coachMessages.userId],
    references: [users.id],
  }),
}));

export const pushAnalysesRelations = relations(pushAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [pushAnalyses.userId],
    references: [users.id],
  }),
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [trainingPlans.userId],
    references: [users.id],
  }),
  pushAnalysis: one(pushAnalyses, {
    fields: [trainingPlans.pushAnalysisId],
    references: [pushAnalyses.id],
  }),
  drills: many(trainingDrills),
}));

export const trainingDrillsRelations = relations(trainingDrills, ({ one }) => ({
  plan: one(trainingPlans, {
    fields: [trainingDrills.planId],
    references: [trainingPlans.id],
  }),
}));
