// Database schema for CRStats - from javascript_log_in_with_replit and javascript_database blueprints
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ============================================================================
// SESSION & AUTH TABLES (Required by Replit Auth - DO NOT DROP)
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// PROFILES TABLE (Extended user information)
// ============================================================================

export const profiles = pgTable("profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name"),
  clashTag: varchar("clash_tag"), // Clash Royale player tag like #2P090J0
  region: varchar("region").default("BR"),
  language: varchar("language").default("pt"),
  role: varchar("role").default("user"), // user | admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// ============================================================================
// SUBSCRIPTIONS TABLE (Stripe billing)
// ============================================================================

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  plan: varchar("plan").notNull().default("free"), // free | pro
  status: varchar("status").notNull().default("inactive"), // active | inactive | canceled | past_due
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ============================================================================
// GOALS TABLE (User goals/targets)
// ============================================================================

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // trophies | streak | winrate | custom
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const favoritePlayers = pgTable("favorite_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  playerTag: varchar("player_tag").notNull(), // Clash Royale player tag
  name: varchar("name").notNull(),
  trophies: integer("trophies"),
  clan: varchar("clan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoritePlayerSchema = createInsertSchema(favoritePlayers).omit({
  id: true,
  createdAt: true,
});
export type InsertFavoritePlayer = z.infer<typeof insertFavoritePlayerSchema>;
export type FavoritePlayer = typeof favoritePlayers.$inferSelect;

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // info | success | warning | error
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  theme: varchar("theme").default("dark"), // light | dark | system
  preferredLanguage: varchar("preferred_language").default("pt"),
  defaultLandingPage: varchar("default_landing_page").default("dashboard"), // dashboard | community | goals | coach
  showAdvancedStats: boolean("show_advanced_stats").default(false),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

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

// ============================================================================
// PLAYER SYNC STATE TABLE (Track last sync timestamp)
// ============================================================================

export const playerSyncState = pgTable("player_sync_state", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

export type PlayerSyncState = typeof playerSyncState.$inferSelect;

// ============================================================================
// COACH MESSAGES TABLE (Chat history with daily limit tracking)
// ============================================================================

export const coachMessages = pgTable("coach_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  contextType: varchar("context_type"), // 'last_battle' | 'push' | 'general' | null
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_coach_messages_user_created").on(table.userId, table.createdAt),
]);

export const insertCoachMessageSchema = createInsertSchema(coachMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertCoachMessage = z.infer<typeof insertCoachMessageSchema>;
export type CoachMessage = typeof coachMessages.$inferSelect;

// ============================================================================
// PUSH ANALYSES TABLE (AI analysis of push sessions)
// ============================================================================

export const pushAnalyses = pgTable("push_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pushStartTime: timestamp("push_start_time").notNull(),
  pushEndTime: timestamp("push_end_time").notNull(),
  battlesCount: integer("battles_count").notNull(),
  wins: integer("wins").notNull(),
  losses: integer("losses").notNull(),
  netTrophies: integer("net_trophies").notNull(),
  resultJson: jsonb("result_json").notNull(), // { summary, strengths[], mistakes[], recommendations[] }
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_push_analyses_user_created").on(table.userId, table.createdAt),
]);

export const insertPushAnalysisSchema = createInsertSchema(pushAnalyses).omit({
  id: true,
  createdAt: true,
});
export type InsertPushAnalysis = z.infer<typeof insertPushAnalysisSchema>;
export type PushAnalysis = typeof pushAnalyses.$inferSelect;

// Push analysis result structure
export const pushAnalysisResultSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  mistakes: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type PushAnalysisResult = z.infer<typeof pushAnalysisResultSchema>;

// ============================================================================
// TRAINING PLANS TABLE (Auto-generated from push analysis)
// ============================================================================

export const trainingPlans = pgTable("training_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  source: varchar("source").notNull().default("push_analysis"), // 'push_analysis' | 'manual'
  status: varchar("status").notNull().default("active"), // 'active' | 'completed' | 'archived'
  pushAnalysisId: varchar("push_analysis_id").references(() => pushAnalyses.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_training_plans_user_status").on(table.userId, table.status),
]);

export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;
export type TrainingPlan = typeof trainingPlans.$inferSelect;

// ============================================================================
// TRAINING DRILLS TABLE (Individual exercises in a plan)
// ============================================================================

export const trainingDrills = pgTable("training_drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  focusArea: varchar("focus_area").notNull(), // 'tilt' | 'macro' | 'deck' | 'matchup' | 'fundamentals'
  description: text("description").notNull(),
  targetGames: integer("target_games").notNull().default(3),
  completedGames: integer("completed_games").notNull().default(0),
  mode: varchar("mode").default("ladder"), // 'ladder' | 'challenge' | 'friendly'
  priority: integer("priority").default(1), // 1-3, higher = more important
  status: varchar("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'completed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_training_drills_plan_status").on(table.planId, table.status),
]);

export const insertTrainingDrillSchema = createInsertSchema(trainingDrills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingDrill = z.infer<typeof insertTrainingDrillSchema>;
export type TrainingDrill = typeof trainingDrills.$inferSelect;

// ============================================================================
// NEW RELATIONS
// ============================================================================

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

export const pushAnalysesRelations = relations(pushAnalyses, ({ one, many }) => ({
  user: one(users, {
    fields: [pushAnalyses.userId],
    references: [users.id],
  }),
  trainingPlans: many(trainingPlans),
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
