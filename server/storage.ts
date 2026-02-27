import {
  users,
  profiles,
  subscriptions,
  goals,
  favoritePlayers,
  notifications,
  userSettings,
  notificationPreferences,
  playerSyncState,
  battleHistory,
  coachMessages,
  pushAnalyses,
  trainingPlans,
  trainingDrills,
  metaDecksCache,
  deckSuggestionsUsage,
  type User,
  type UpsertUser,
  type Profile,
  type InsertProfile,
  type Subscription,
  type InsertSubscription,
  type Goal,
  type InsertGoal,
  type FavoritePlayer,
  type InsertFavoritePlayer,
  type Notification,
  type InsertNotification,
  type UserSettings,
  type InsertUserSettings,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type PlayerSyncState,
  type BattleHistory,
  type InsertBattleHistory,
  type CoachMessage,
  type InsertCoachMessage,
  type PushAnalysis,
  type InsertPushAnalysis,
  type TrainingPlan,
  type InsertTrainingPlan,
  type TrainingDrill,
  type InsertTrainingDrill,
  type MetaDeckCache,
  type InsertMetaDeckCache,
  arenaMetaDecks,
  arenaCounterDecks,
  type ArenaMetaDeck,
  type InsertArenaMetaDeck,
  type ArenaCounterDeck,
  type InsertArenaCounterDeck,
} from "@shared/schema";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, desc, gte, lt, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import type { SupabaseAuthContext } from "./supabaseAuth";
import { FREE_BATTLE_LIMIT, PRO_HISTORY_MAX_DAYS, buildBattleKey, extractBattleTime } from "./domain/battleHistory";

interface BootstrapResult {
  profile: Profile;
  settings: UserSettings;
  subscription: Subscription;
  notificationPreferences: NotificationPreferences;
}

/**
 * A session object representing an open transaction with RLS context already set.
 * Storage methods can optionally accept this to reuse the existing transaction
 * instead of opening a new `runAsUser` context per call (TD-051).
 */
export interface DbSession {
  /** Drizzle-compatible connection (the active transaction). */
  conn: any;
}

interface MetaDeckWriteInput {
  deckHash: string;
  cards: string[];
  usageCount?: number;
  avgTrophies?: number | null;
  archetype?: string | null;
  wins?: number;
  losses?: number;
  draws?: number;
  avgElixir?: number | null;
  winRateEstimate?: number | null;
  sourceRegion?: string | null;
  sourceRange?: string | null;
  lastUpdatedAt?: Date | null;
}

function normalizePlayerTag(tag: string | null | undefined): string | null | undefined {
  if (tag === undefined) return undefined;
  if (tag === null) return null;

  const trimmed = tag.trim();
  if (!trimmed) {
    return null;
  }

  const withoutHash = trimmed.replace(/^#/, "").toUpperCase();
  return `#${withoutHash}`;
}

function buildCanonicalProfileData(profileData: Partial<InsertProfile>): Partial<InsertProfile> {
  const normalizedLegacy = normalizePlayerTag(profileData.clashTag as string | null | undefined);
  const normalizedDefault = normalizePlayerTag(profileData.defaultPlayerTag as string | null | undefined);

  let clashTag = normalizedLegacy;
  let defaultPlayerTag = normalizedDefault;

  if (defaultPlayerTag !== undefined && clashTag === undefined) {
    clashTag = defaultPlayerTag;
  }

  if (clashTag !== undefined && defaultPlayerTag === undefined) {
    defaultPlayerTag = clashTag;
  }

  if (defaultPlayerTag !== undefined) {
    clashTag = defaultPlayerTag;
  }

  return {
    ...profileData,
    clashTag,
    defaultPlayerTag,
  };
}

export interface IStorage {
  // Session management (TD-051)
  withUserSession<T>(fn: (session: DbSession) => Promise<T>): Promise<T>;

  // User operations
  getUser(id: string, session?: DbSession): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  bootstrapUserData(userId: string, session?: DbSession): Promise<BootstrapResult>;

  // Profile operations
  getProfile(userId: string, session?: DbSession): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;

  // Subscription operations
  getSubscription(userId: string, session?: DbSession): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  isPro(userId: string): Promise<boolean>;

  // Goals operations
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  // Favorite Players operations
  getFavoritePlayers(userId: string): Promise<FavoritePlayer[]>;
  getFavoritePlayer(id: string): Promise<FavoritePlayer | undefined>;
  createFavoritePlayer(player: InsertFavoritePlayer): Promise<FavoritePlayer>;
  deleteFavoritePlayer(id: string): Promise<void>;
  refreshFavoritePlayerData(
    userId: string,
    playerTag: string,
    data: { trophies?: number | null; clan?: string | null },
  ): Promise<void>;

  // Notifications operations
  getNotifications(userId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  deleteNotificationsByUser(userId: string): Promise<void>;

  // Notification preferences operations
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(
    userId: string,
    preferences: Partial<InsertNotificationPreferences>,
  ): Promise<NotificationPreferences>;

  // User Settings operations
  getUserSettings(userId: string, session?: DbSession): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;

  // Player Sync State operations
  getSyncState(userId: string): Promise<PlayerSyncState | undefined>;
  updateSyncState(userId: string): Promise<PlayerSyncState>;

  // Battle History operations
  upsertBattleHistory(userId: string, playerTag: string, battles: any[]): Promise<{ inserted: number }>;
  getBattleHistory(
    userId: string,
    playerTag: string,
    options?: { since?: Date; limit?: number },
  ): Promise<any[]>;
  pruneBattleHistory(userId: string, playerTag: string, policy: { isPro: boolean; now?: Date }): Promise<void>;

  // Coach Messages operations
  getCoachMessages(userId: string, limit?: number): Promise<CoachMessage[]>;
  createCoachMessage(message: InsertCoachMessage): Promise<CoachMessage>;
  countCoachMessagesToday(userId: string): Promise<number>;

  // Push Analyses operations
  getPushAnalysis(id: string): Promise<PushAnalysis | undefined>;
  getLatestPushAnalysis(userId: string): Promise<PushAnalysis | undefined>;
  getPushAnalyses(userId: string, limit?: number): Promise<PushAnalysis[]>;
  createPushAnalysis(analysis: InsertPushAnalysis): Promise<PushAnalysis>;
  countPushAnalysesToday(userId: string): Promise<number>;

  // Training Plans operations
  getActivePlan(userId: string): Promise<TrainingPlan | undefined>;
  getTrainingPlan(id: string): Promise<TrainingPlan | undefined>;
  getTrainingPlans(userId: string): Promise<TrainingPlan[]>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: string, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan | undefined>;
  archiveOldPlans(userId: string): Promise<void>;

  // Training Drills operations
  getTrainingDrill(id: string): Promise<TrainingDrill | undefined>;
  getDrillsByPlan(planId: string): Promise<TrainingDrill[]>;
  createTrainingDrill(drill: InsertTrainingDrill): Promise<TrainingDrill>;
  updateTrainingDrill(id: string, drill: Partial<InsertTrainingDrill>): Promise<TrainingDrill | undefined>;
  countActiveDrills(planId: string): Promise<number>;

  // Meta Decks Cache operations
  getMetaDecks(options?: { minTrophies?: number; limit?: number }): Promise<MetaDeckCache[]>;
  getMetaDecksLastUpdated(options?: { sourceRange?: string | null }): Promise<Date | null>;
  replaceMetaDecks(decks: InsertMetaDeckCache[]): Promise<void>;
  createMetaDeck(deck: Partial<MetaDeckWriteInput>): Promise<MetaDeckCache>;
  clearMetaDecks(): Promise<void>;

  // Deck suggestions usage (FREE limits)
  countDeckSuggestionsToday(userId: string, type: "counter" | "optimizer"): Promise<number>;
  incrementDeckSuggestionUsage(userId: string, type: "counter" | "optimizer"): Promise<void>;

  // Arena Meta Decks (Story 2.1)
  getArenaMetaDecks(arenaId: number, options?: { limit?: number }): Promise<ArenaMetaDeck[]>;
  replaceArenaMetaDecks(arenaId: number, decks: InsertArenaMetaDeck[]): Promise<void>;
  replaceAllArenaData(
    metaDecks: InsertArenaMetaDeck[],
    counterDecks: InsertArenaCounterDeck[],
  ): Promise<void>;

  // Arena Counter Decks (Story 2.1)
  getArenaCounterDecks(arenaId: number, targetCard: string, options?: { limit?: number }): Promise<ArenaCounterDeck[]>;
}

export class DatabaseStorage implements IStorage {
  private readonly auth?: SupabaseAuthContext;

  constructor(options?: { auth?: SupabaseAuthContext }) {
    this.auth = options?.auth;
  }

  /**
   * Execute `fn` within an RLS-scoped transaction.
   * If a `session` is provided (from `withUserSession`), reuses its connection
   * instead of opening a new transaction — this avoids repeated SET commands (TD-051).
   */
  private async runAsUser<T>(fn: (conn: any) => Promise<T>, session?: DbSession): Promise<T> {
    // If a session is provided, reuse it (RLS context already set)
    if (session) {
      return fn(session.conn);
    }

    const auth = this.auth;

    if (!auth) {
      return fn(db);
    }

    const claims = auth.claims ?? { sub: auth.userId, role: "authenticated" };
    const claimsJson = JSON.stringify(claims);

    // RLS context is only guaranteed for statements executed within this transaction.
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('request.jwt.claims', ${claimsJson}, true)`);
      // Supabase `auth.uid()` and related helpers commonly read these per-claim GUCs.
      await tx.execute(sql`select set_config('request.jwt.claim.sub', ${auth.userId}, true)`);
      await tx.execute(sql`select set_config('request.jwt.claim.role', ${auth.role ?? "authenticated"}, true)`);
      await tx.execute(sql`set local role authenticated`);
      return fn(tx);
    });
  }

  /**
   * Open a single transaction with RLS context set once, then run multiple
   * queries through the provided callback.  This avoids the 4 SET commands
   * per individual `runAsUser` call (TD-051).
   *
   * Storage methods called with the returned session reuse the existing
   * connection.  Methods called without a session still create their own
   * `runAsUser` context (backward compatible — AC14).
   */
  async withUserSession<T>(fn: (session: DbSession) => Promise<T>): Promise<T> {
    const auth = this.auth;

    if (!auth) {
      // No auth context — run within a plain transaction for consistency
      return db.transaction(async (tx) => {
        return fn({ conn: tx });
      });
    }

    const claims = auth.claims ?? { sub: auth.userId, role: "authenticated" };
    const claimsJson = JSON.stringify(claims);

    // Use a raw pg client to get a dedicated connection for the session
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claimsJson]);
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [auth.userId]);
      await client.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [auth.role ?? "authenticated"]);
      await client.query(`SET LOCAL role authenticated`);

      // Create a drizzle instance bound to this client for the session
      const sessionDb = drizzle(client as any, { schema });
      const session: DbSession = { conn: sessionDb };

      const result = await fn(session);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async getUser(id: string, session?: DbSession): Promise<User | undefined> {
    return this.runAsUser(async (conn) => {
      const [user] = await conn.select().from(users).where(eq(users.id, id));
      return user;
    }, session);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return this.runAsUser(async (conn) => {
      const [user] = await conn
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return user;
    });
  }

  /**
   * Shared bootstrap logic used by both the RLS and no-RLS paths (TD-025).
   * Extracted to eliminate ~85 lines of duplication.
   */
  private async _bootstrapInTransaction(tx: any, userId: string): Promise<BootstrapResult> {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    const fallbackDisplayName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0] ||
      "Player";

    await tx
      .insert(profiles)
      .values({
        userId,
        displayName: fallbackDisplayName,
        region: "BR",
        language: "pt",
        role: "user",
      })
      .onConflictDoNothing();

    await tx
      .insert(userSettings)
      .values({
        userId,
        theme: "dark",
        preferredLanguage: "pt",
        defaultLandingPage: "dashboard",
        showAdvancedStats: false,
        notificationsEnabled: true,
      })
      .onConflictDoNothing();

    await tx
      .insert(subscriptions)
      .values({
        userId,
        plan: "free",
        status: "inactive",
        cancelAtPeriodEnd: false,
      })
      .onConflictDoNothing();

    await tx
      .insert(notificationPreferences)
      .values({
        userId,
        training: true,
        billing: true,
        system: true,
      })
      .onConflictDoNothing();

    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    const [settings] = await tx.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    const [prefs] = await tx
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!profile || !settings || !subscription || !prefs) {
      throw new Error("Failed to bootstrap canonical user data");
    }

    return {
      profile,
      settings,
      subscription,
      notificationPreferences: prefs,
    };
  }

  async bootstrapUserData(userId: string, session?: DbSession): Promise<BootstrapResult> {
    if (session) {
      return this._bootstrapInTransaction(session.conn, userId);
    }

    if (!this.auth) {
      return db.transaction(async (tx) => this._bootstrapInTransaction(tx, userId));
    }

    return this.runAsUser(async (tx) => this._bootstrapInTransaction(tx, userId));
  }

  async getProfile(userId: string, session?: DbSession): Promise<Profile | undefined> {
    return this.runAsUser(async (conn) => {
      const [profile] = await conn.select().from(profiles).where(eq(profiles.userId, userId));
      return profile;
    }, session);
  }

  async createProfile(profileData: InsertProfile): Promise<Profile> {
    return this.runAsUser(async (conn) => {
      const canonicalData = buildCanonicalProfileData(profileData);

      const [profile] = await conn
        .insert(profiles)
        .values(canonicalData as InsertProfile)
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            ...canonicalData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return profile;
    });
  }

  async updateProfile(userId: string, profileData: Partial<InsertProfile>): Promise<Profile | undefined> {
    return this.runAsUser(async (conn) => {
      const canonicalData = buildCanonicalProfileData(profileData);

      const [profile] = await conn
        .insert(profiles)
        .values({ userId, ...canonicalData })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            ...canonicalData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return profile;
    });
  }

  async getSubscription(userId: string, session?: DbSession): Promise<Subscription | undefined> {
    return this.runAsUser(async (conn) => {
      const [subscription] = await conn
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      return subscription;
    }, session);
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    return this.runAsUser(async (conn) => {
      const [result] = await conn
        .insert(subscriptions)
        .values(subscriptionData)
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            ...subscriptionData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    });
  }

  async updateSubscription(
    id: string,
    subscriptionData: Partial<InsertSubscription>,
  ): Promise<Subscription | undefined> {
    return this.runAsUser(async (conn) => {
      const [subscription] = await conn
        .update(subscriptions)
        .set({ ...subscriptionData, updatedAt: new Date() })
        .where(eq(subscriptions.id, id))
        .returning();

      return subscription;
    });
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    return this.runAsUser(async (conn) => {
      const [subscription] = await conn
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

      return subscription;
    });
  }

  async isPro(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    return subscription?.plan === "pro" && subscription?.status === "active";
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return this.runAsUser((conn) =>
      conn.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt)),
    );
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    return this.runAsUser(async (conn) => {
      const [goal] = await conn.select().from(goals).where(eq(goals.id, id));
      return goal;
    });
  }

  async createGoal(goalData: InsertGoal): Promise<Goal> {
    return this.runAsUser(async (conn) => {
      const [goal] = await conn.insert(goals).values(goalData).returning();
      return goal;
    });
  }

  async updateGoal(id: string, goalData: Partial<InsertGoal>): Promise<Goal | undefined> {
    return this.runAsUser(async (conn) => {
      const [goal] = await conn
        .update(goals)
        .set({ ...goalData, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning();

      return goal;
    });
  }

  async deleteGoal(id: string): Promise<void> {
    await this.runAsUser((conn) => conn.delete(goals).where(eq(goals.id, id)));
  }

  async getFavoritePlayers(userId: string): Promise<FavoritePlayer[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(favoritePlayers)
        .where(eq(favoritePlayers.userId, userId))
        .orderBy(desc(favoritePlayers.createdAt)),
    );
  }

  async getFavoritePlayer(id: string): Promise<FavoritePlayer | undefined> {
    return this.runAsUser(async (conn) => {
      const [player] = await conn.select().from(favoritePlayers).where(eq(favoritePlayers.id, id));
      return player;
    });
  }

  async createFavoritePlayer(playerData: InsertFavoritePlayer): Promise<FavoritePlayer> {
    return this.runAsUser(async (conn) => {
      const payload = {
        ...playerData,
        playerTag: normalizePlayerTag(playerData.playerTag) ?? playerData.playerTag,
      };

      const [player] = await conn
        .insert(favoritePlayers)
        .values(payload)
        .onConflictDoUpdate({
          target: [favoritePlayers.userId, favoritePlayers.playerTag],
          set: {
            name: payload.name,
            trophies: payload.trophies ?? null,
            clan: payload.clan ?? null,
          },
        })
        .returning();
      return player;
    });
  }

  async deleteFavoritePlayer(id: string): Promise<void> {
    await this.runAsUser((conn) => conn.delete(favoritePlayers).where(eq(favoritePlayers.id, id)));
  }

  /**
   * Update matching favorite_players rows with fresh trophies and clan data (TD-033).
   * Piggybacks on existing player data -- no additional API calls needed.
   */
  async refreshFavoritePlayerData(
    userId: string,
    playerTag: string,
    data: { trophies?: number | null; clan?: string | null },
  ): Promise<void> {
    const normalizedTag = normalizePlayerTag(playerTag);
    if (!normalizedTag) return;

    await this.runAsUser(async (conn) => {
      await conn
        .update(favoritePlayers)
        .set({
          trophies: data.trophies ?? null,
          clan: data.clan ?? null,
        })
        .where(
          and(
            eq(favoritePlayers.userId, userId),
            eq(favoritePlayers.playerTag, normalizedTag),
          ),
        );
    });
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt)),
    );
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.runAsUser(async (conn) => {
      const [notification] = await conn.select().from(notifications).where(eq(notifications.id, id));
      return notification;
    });
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    return this.runAsUser(async (conn) => {
      const [notification] = await conn.insert(notifications).values(notificationData).returning();
      return notification;
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.runAsUser((conn) =>
      conn.update(notifications).set({ read: true }).where(eq(notifications.id, id)),
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.runAsUser((conn) =>
      conn.update(notifications).set({ read: true }).where(eq(notifications.userId, userId)),
    );
  }

  async deleteNotification(id: string): Promise<void> {
    await this.runAsUser((conn) => conn.delete(notifications).where(eq(notifications.id, id)));
  }

  async deleteNotificationsByUser(userId: string): Promise<void> {
    await this.runAsUser((conn) => conn.delete(notifications).where(eq(notifications.userId, userId)));
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    return this.runAsUser(async (conn) => {
      const [prefs] = await conn
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));

      return prefs;
    });
  }

  async upsertNotificationPreferences(
    userId: string,
    preferencesData: Partial<InsertNotificationPreferences>,
  ): Promise<NotificationPreferences> {
    return this.runAsUser(async (conn) => {
      const [prefs] = await conn
        .insert(notificationPreferences)
        .values({
          userId,
          training: preferencesData.training ?? true,
          billing: preferencesData.billing ?? true,
          system: preferencesData.system ?? true,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            ...preferencesData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return prefs;
    });
  }

  async getUserSettings(userId: string, session?: DbSession): Promise<UserSettings | undefined> {
    return this.runAsUser(async (conn) => {
      const [settings] = await conn.select().from(userSettings).where(eq(userSettings.userId, userId));
      return settings;
    }, session);
  }

  async createUserSettings(settingsData: InsertUserSettings): Promise<UserSettings> {
    return this.runAsUser(async (conn) => {
      const [settings] = await conn
        .insert(userSettings)
        .values(settingsData)
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            ...settingsData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return settings;
    });
  }

  async updateUserSettings(
    userId: string,
    settingsData: Partial<InsertUserSettings>,
  ): Promise<UserSettings | undefined> {
    return this.runAsUser(async (conn) => {
      const [settings] = await conn
        .insert(userSettings)
        .values({ userId, ...settingsData })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            ...settingsData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return settings;
    });
  }

  async getSyncState(userId: string): Promise<PlayerSyncState | undefined> {
    return this.runAsUser(async (conn) => {
      const [state] = await conn.select().from(playerSyncState).where(eq(playerSyncState.userId, userId));
      return state;
    });
  }

  async updateSyncState(userId: string): Promise<PlayerSyncState> {
    return this.runAsUser(async (conn) => {
      const [state] = await conn
        .insert(playerSyncState)
        .values({ userId, lastSyncedAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: playerSyncState.userId,
          set: { lastSyncedAt: new Date(), updatedAt: new Date() },
        })
        .returning();

      return state;
    });
  }

  async upsertBattleHistory(userId: string, playerTag: string, battles: any[]): Promise<{ inserted: number }> {
    const canonicalTag = normalizePlayerTag(playerTag) ?? playerTag;
    const rows: InsertBattleHistory[] = [];

    for (const battle of Array.isArray(battles) ? battles : []) {
      const battleTime = extractBattleTime(battle?.battleTime);
      if (!battleTime) continue;

      rows.push({
        userId,
        playerTag: canonicalTag,
        battleTime,
        battleKey: buildBattleKey({ userId, playerTag: canonicalTag, battle }),
        battleJson: (battle || {}) as any,
      });
    }

    if (rows.length === 0) {
      return { inserted: 0 };
    }

    return this.runAsUser(async (conn) => {
      const insertedRows = await conn
        .insert(battleHistory)
        .values(rows)
        .onConflictDoNothing({ target: battleHistory.battleKey })
        .returning({ battleKey: battleHistory.battleKey });

      return { inserted: insertedRows.length };
    });
  }

  async getBattleHistory(
    userId: string,
    playerTag: string,
    options?: { since?: Date; limit?: number },
  ): Promise<any[]> {
    const canonicalTag = normalizePlayerTag(playerTag) ?? playerTag;
    const limit = typeof options?.limit === "number" && Number.isFinite(options.limit) ? Math.max(1, options.limit) : 2000;

    return this.runAsUser(async (conn) => {
      const rows = await conn
        .select({ battleJson: battleHistory.battleJson })
        .from(battleHistory)
        .where(
          and(
            eq(battleHistory.userId, userId),
            eq(battleHistory.playerTag, canonicalTag),
            options?.since ? gte(battleHistory.battleTime, options.since) : undefined,
          ),
        )
        .orderBy(desc(battleHistory.battleTime))
        .limit(limit);

      return rows.map((row: { battleJson: any }) => row.battleJson);
    });
  }

  async pruneBattleHistory(userId: string, playerTag: string, policy: { isPro: boolean; now?: Date }): Promise<void> {
    const canonicalTag = normalizePlayerTag(playerTag) ?? playerTag;

    await this.runAsUser(async (conn) => {
      if (policy.isPro) {
        const now = policy.now ?? new Date();
        const cutoff = new Date(now.getTime() - PRO_HISTORY_MAX_DAYS * 24 * 60 * 60 * 1000);
        await conn
          .delete(battleHistory)
          .where(
            and(
              eq(battleHistory.userId, userId),
              eq(battleHistory.playerTag, canonicalTag),
              lt(battleHistory.battleTime, cutoff),
            ),
          );
        return;
      }

      const keep = await conn
        .select({ id: battleHistory.id })
        .from(battleHistory)
        .where(and(eq(battleHistory.userId, userId), eq(battleHistory.playerTag, canonicalTag)))
        .orderBy(desc(battleHistory.battleTime))
        .limit(FREE_BATTLE_LIMIT);

      const keepIds = keep.map((row: { id: string }) => row.id).filter(Boolean);
      if (keepIds.length === 0) return;

      await conn
        .delete(battleHistory)
        .where(
          and(
            eq(battleHistory.userId, userId),
            eq(battleHistory.playerTag, canonicalTag),
            notInArray(battleHistory.id, keepIds),
          ),
        );
    });
  }

  async getCoachMessages(userId: string, limit = 50): Promise<CoachMessage[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.userId, userId))
        .orderBy(desc(coachMessages.createdAt))
        .limit(limit),
    );
  }

  async createCoachMessage(messageData: InsertCoachMessage): Promise<CoachMessage> {
    return this.runAsUser(async (conn) => {
      const [message] = await conn.insert(coachMessages).values(messageData).returning();
      return message;
    });
  }

  async countCoachMessagesToday(userId: string): Promise<number> {
    return this.runAsUser(async (conn) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const result = await conn
        .select({ count: sql<number>`count(*)::int` })
        .from(coachMessages)
        .where(
          and(
            eq(coachMessages.userId, userId),
            eq(coachMessages.role, "user"),
            gte(coachMessages.createdAt, todayStart),
          ),
        );

      return result[0]?.count || 0;
    });
  }

  async getPushAnalysis(id: string): Promise<PushAnalysis | undefined> {
    return this.runAsUser(async (conn) => {
      const [analysis] = await conn.select().from(pushAnalyses).where(eq(pushAnalyses.id, id));
      return analysis;
    });
  }

  async getLatestPushAnalysis(userId: string): Promise<PushAnalysis | undefined> {
    return this.runAsUser(async (conn) => {
      const [analysis] = await conn
        .select()
        .from(pushAnalyses)
        .where(eq(pushAnalyses.userId, userId))
        .orderBy(desc(pushAnalyses.createdAt))
        .limit(1);

      return analysis;
    });
  }

  async getPushAnalyses(userId: string, limit = 10): Promise<PushAnalysis[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(pushAnalyses)
        .where(eq(pushAnalyses.userId, userId))
        .orderBy(desc(pushAnalyses.createdAt))
        .limit(limit),
    );
  }

  async createPushAnalysis(analysisData: InsertPushAnalysis): Promise<PushAnalysis> {
    return this.runAsUser(async (conn) => {
      const [analysis] = await conn.insert(pushAnalyses).values(analysisData).returning();
      return analysis;
    });
  }

  async countPushAnalysesToday(userId: string): Promise<number> {
    return this.runAsUser(async (conn) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const result = await conn
        .select({ count: sql<number>`count(*)::int` })
        .from(pushAnalyses)
        .where(and(eq(pushAnalyses.userId, userId), gte(pushAnalyses.createdAt, todayStart)));

      return result[0]?.count || 0;
    });
  }

  async getActivePlan(userId: string): Promise<TrainingPlan | undefined> {
    return this.runAsUser(async (conn) => {
      const [plan] = await conn
        .select()
        .from(trainingPlans)
        .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.status, "active")))
        .orderBy(desc(trainingPlans.createdAt))
        .limit(1);

      return plan;
    });
  }

  async getTrainingPlan(id: string): Promise<TrainingPlan | undefined> {
    return this.runAsUser(async (conn) => {
      const [plan] = await conn.select().from(trainingPlans).where(eq(trainingPlans.id, id));
      return plan;
    });
  }

  async getTrainingPlans(userId: string): Promise<TrainingPlan[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.userId, userId))
        .orderBy(desc(trainingPlans.createdAt)),
    );
  }

  async createTrainingPlan(planData: InsertTrainingPlan): Promise<TrainingPlan> {
    return this.runAsUser(async (conn) => {
      const [plan] = await conn.insert(trainingPlans).values(planData).returning();
      return plan;
    });
  }

  async updateTrainingPlan(
    id: string,
    planData: Partial<InsertTrainingPlan>,
  ): Promise<TrainingPlan | undefined> {
    return this.runAsUser(async (conn) => {
      const [plan] = await conn
        .update(trainingPlans)
        .set({ ...planData, updatedAt: new Date() })
        .where(eq(trainingPlans.id, id))
        .returning();

      return plan;
    });
  }

  async archiveOldPlans(userId: string): Promise<void> {
    await this.runAsUser((conn) =>
      conn
        .update(trainingPlans)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.status, "active"))),
    );
  }

  async getTrainingDrill(id: string): Promise<TrainingDrill | undefined> {
    return this.runAsUser(async (conn) => {
      const [drill] = await conn.select().from(trainingDrills).where(eq(trainingDrills.id, id));
      return drill;
    });
  }

  async getDrillsByPlan(planId: string): Promise<TrainingDrill[]> {
    return this.runAsUser((conn) =>
      conn
        .select()
        .from(trainingDrills)
        .where(eq(trainingDrills.planId, planId))
        .orderBy(desc(trainingDrills.priority)),
    );
  }

  async createTrainingDrill(drillData: InsertTrainingDrill): Promise<TrainingDrill> {
    return this.runAsUser(async (conn) => {
      const [drill] = await conn.insert(trainingDrills).values(drillData).returning();
      return drill;
    });
  }

  async updateTrainingDrill(
    id: string,
    drillData: Partial<InsertTrainingDrill>,
  ): Promise<TrainingDrill | undefined> {
    return this.runAsUser(async (conn) => {
      const [drill] = await conn
        .update(trainingDrills)
        .set({ ...drillData, updatedAt: new Date() })
        .where(eq(trainingDrills.id, id))
        .returning();

      return drill;
    });
  }

  async countActiveDrills(planId: string): Promise<number> {
    return this.runAsUser(async (conn) => {
      const result = await conn
        .select({ count: sql<number>`count(*)::int` })
        .from(trainingDrills)
        .where(and(eq(trainingDrills.planId, planId), sql`${trainingDrills.status} != 'completed'`));

      return result[0]?.count || 0;
    });
  }

  async getMetaDecks(options?: { minTrophies?: number; limit?: number }): Promise<MetaDeckCache[]> {
    const limit = typeof options?.limit === "number" && Number.isFinite(options.limit) ? Math.max(1, Math.min(200, Math.floor(options.limit))) : 50;
    const minTrophies =
      typeof options?.minTrophies === "number" && Number.isFinite(options.minTrophies)
        ? Math.max(0, Math.floor(options.minTrophies))
        : null;

    return this.runAsUser((conn) => {
      const base = conn.select().from(metaDecksCache);
      const filtered = minTrophies !== null ? base.where(gte(metaDecksCache.avgTrophies, minTrophies)) : base;
      return filtered.orderBy(desc(metaDecksCache.usageCount)).limit(limit);
    });
  }

  async getMetaDecksLastUpdated(options?: { sourceRange?: string | null }): Promise<Date | null> {
    return this.runAsUser(async (conn) => {
      const base = conn
        .select({
          max: sql<Date | null>`max(${metaDecksCache.lastUpdatedAt})`,
        })
        .from(metaDecksCache);

      const scoped =
        options?.sourceRange && typeof options.sourceRange === "string"
          ? base.where(eq(metaDecksCache.sourceRange, options.sourceRange))
          : base;

      const result = await scoped;
      return result[0]?.max ?? null;
    });
  }

  async replaceMetaDecks(decks: InsertMetaDeckCache[]): Promise<void> {
    const normalizedDecks = Array.isArray(decks) ? decks : [];

    const exec = async (conn: any) => {
      await conn.delete(metaDecksCache);
      if (normalizedDecks.length > 0) {
        await conn.insert(metaDecksCache).values(normalizedDecks);
      }
    };

    // When called as the service storage (no auth), wrap in an explicit transaction
    // to prevent empty-window reads.
    if (!this.auth) {
      await db.transaction(async (tx) => exec(tx));
      return;
    }

    // When called with user auth, runAsUser already executes inside a transaction.
    await this.runAsUser(exec);
  }

  async createMetaDeck(deckData: Partial<MetaDeckWriteInput>): Promise<MetaDeckCache> {
    if (!deckData.deckHash || !Array.isArray(deckData.cards)) {
      throw new Error("deckHash and cards are required to create meta deck cache");
    }

    const normalizedCards = [...deckData.cards];
    const normalizedPayload: MetaDeckWriteInput = {
      deckHash: deckData.deckHash,
      cards: normalizedCards,
      usageCount: deckData.usageCount ?? 0,
      avgTrophies: deckData.avgTrophies ?? null,
      archetype: deckData.archetype ?? null,
      wins: deckData.wins ?? 0,
      losses: deckData.losses ?? 0,
      draws: deckData.draws ?? 0,
      avgElixir: deckData.avgElixir ?? null,
      winRateEstimate: deckData.winRateEstimate ?? null,
      sourceRegion: deckData.sourceRegion ?? null,
      sourceRange: deckData.sourceRange ?? null,
      lastUpdatedAt: deckData.lastUpdatedAt ?? new Date(),
    };

    return this.runAsUser(async (conn) => {
      const [deck] = await conn
        .insert(metaDecksCache)
        .values(normalizedPayload)
        .onConflictDoUpdate({
          target: metaDecksCache.deckHash,
          set: {
            cards: normalizedCards,
            usageCount: deckData.usageCount ?? 0,
            avgTrophies: deckData.avgTrophies ?? null,
            archetype: deckData.archetype ?? null,
            wins: deckData.wins ?? 0,
            losses: deckData.losses ?? 0,
            draws: deckData.draws ?? 0,
            avgElixir: deckData.avgElixir ?? null,
            winRateEstimate: deckData.winRateEstimate ?? null,
            sourceRegion: deckData.sourceRegion ?? null,
            sourceRange: deckData.sourceRange ?? null,
            lastUpdatedAt: new Date(),
          },
        })
        .returning();

      return deck;
    });
  }

  async clearMetaDecks(): Promise<void> {
    await this.runAsUser((conn) => conn.delete(metaDecksCache));
  }

  async countDeckSuggestionsToday(userId: string, type: "counter" | "optimizer"): Promise<number> {
    return this.runAsUser(async (conn) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const result = await conn
        .select({ count: sql<number>`count(*)::int` })
        .from(deckSuggestionsUsage)
        .where(
          and(
            eq(deckSuggestionsUsage.userId, userId),
            eq(deckSuggestionsUsage.suggestionType, type),
            gte(deckSuggestionsUsage.createdAt, todayStart),
          ),
        );

      return result[0]?.count ?? 0;
    });
  }

  async incrementDeckSuggestionUsage(userId: string, type: "counter" | "optimizer"): Promise<void> {
    await this.runAsUser(async (conn) => {
      await conn.insert(deckSuggestionsUsage).values({
        userId,
        suggestionType: type,
      });
    });
  }

  // ── Arena Meta Decks (Story 2.1) ──────────────────────────────────────────

  async getArenaMetaDecks(arenaId: number, options?: { limit?: number }): Promise<ArenaMetaDeck[]> {
    const limit = typeof options?.limit === "number" && Number.isFinite(options.limit) ? Math.max(1, Math.min(100, options.limit)) : 50;

    return this.runAsUser((conn) =>
      conn
        .select()
        .from(arenaMetaDecks)
        .where(eq(arenaMetaDecks.arenaId, arenaId))
        .orderBy(desc(arenaMetaDecks.winRate))
        .limit(limit),
    );
  }

  async replaceArenaMetaDecks(arenaId: number, decks: InsertArenaMetaDeck[]): Promise<void> {
    const normalizedDecks = Array.isArray(decks) ? decks : [];

    const exec = async (conn: any) => {
      await conn.delete(arenaMetaDecks).where(eq(arenaMetaDecks.arenaId, arenaId));
      if (normalizedDecks.length > 0) {
        await conn.insert(arenaMetaDecks).values(normalizedDecks);
      }
    };

    if (!this.auth) {
      await db.transaction(async (tx) => exec(tx));
      return;
    }
    await this.runAsUser(exec);
  }

  async replaceAllArenaData(
    metaDecks: InsertArenaMetaDeck[],
    counterDecks: InsertArenaCounterDeck[],
  ): Promise<void> {
    const exec = async (conn: any) => {
      // Clear all existing data
      await conn.delete(arenaMetaDecks);
      await conn.delete(arenaCounterDecks);

      // Insert new data in batches to avoid parameter limits
      const META_BATCH_SIZE = 100;
      for (let i = 0; i < metaDecks.length; i += META_BATCH_SIZE) {
        const batch = metaDecks.slice(i, i + META_BATCH_SIZE);
        if (batch.length > 0) {
          await conn.insert(arenaMetaDecks).values(batch);
        }
      }

      const COUNTER_BATCH_SIZE = 100;
      for (let i = 0; i < counterDecks.length; i += COUNTER_BATCH_SIZE) {
        const batch = counterDecks.slice(i, i + COUNTER_BATCH_SIZE);
        if (batch.length > 0) {
          await conn.insert(arenaCounterDecks).values(batch);
        }
      }
    };

    if (!this.auth) {
      await db.transaction(async (tx) => exec(tx));
      return;
    }
    await this.runAsUser(exec);
  }

  async getArenaCounterDecks(
    arenaId: number,
    targetCard: string,
    options?: { limit?: number },
  ): Promise<ArenaCounterDeck[]> {
    const limit = typeof options?.limit === "number" && Number.isFinite(options.limit) ? Math.max(1, Math.min(50, options.limit)) : 10;
    const cardKey = targetCard.trim().toLowerCase();

    return this.runAsUser((conn) =>
      conn
        .select()
        .from(arenaCounterDecks)
        .where(
          and(
            eq(arenaCounterDecks.arenaId, arenaId),
            eq(arenaCounterDecks.targetCard, cardKey),
          ),
        )
        .orderBy(desc(arenaCounterDecks.winRateVsTarget))
        .limit(limit),
    );
  }
}

export const serviceStorage = new DatabaseStorage();

export function getUserStorage(auth: SupabaseAuthContext) {
  return new DatabaseStorage({ auth });
}
