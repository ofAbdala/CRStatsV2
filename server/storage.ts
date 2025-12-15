// From javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  profiles,
  subscriptions,
  goals,
  favoritePlayers,
  notifications,
  userSettings,
  playerSyncState,
  coachMessages,
  pushAnalyses,
  trainingPlans,
  trainingDrills,
  metaDecksCache,
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
  type PlayerSyncState,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (Required by Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Profile operations
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  
  // Subscription operations
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  isPro(userId: string): Promise<boolean>;
  
  // Goals operations
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;
  
  // Favorite Players operations
  getFavoritePlayers(userId: string): Promise<FavoritePlayer[]>;
  createFavoritePlayer(player: InsertFavoritePlayer): Promise<FavoritePlayer>;
  deleteFavoritePlayer(id: string): Promise<void>;
  
  // Notifications operations
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  
  // User Settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  
  // Player Sync State operations
  getSyncState(userId: string): Promise<PlayerSyncState | undefined>;
  updateSyncState(userId: string): Promise<PlayerSyncState>;
  
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
  getTrainingPlans(userId: string): Promise<TrainingPlan[]>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: string, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan | undefined>;
  archiveOldPlans(userId: string): Promise<void>;
  
  // Training Drills operations
  getDrillsByPlan(planId: string): Promise<TrainingDrill[]>;
  createTrainingDrill(drill: InsertTrainingDrill): Promise<TrainingDrill>;
  updateTrainingDrill(id: string, drill: Partial<InsertTrainingDrill>): Promise<TrainingDrill | undefined>;
  countActiveDrills(planId: string): Promise<number>;
  
  // Meta Decks Cache operations
  getMetaDecks(): Promise<MetaDeckCache[]>;
  createMetaDeck(deck: Partial<InsertMetaDeckCache>): Promise<MetaDeckCache>;
  clearMetaDecks(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // User operations (Required by Replit Auth)
  // ============================================================================
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
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
  }

  // ============================================================================
  // Profile operations
  // ============================================================================
  
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profileData: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(profileData).returning();
    return profile;
  }

  async updateProfile(userId: string, profileData: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [profile] = await db
      .insert(profiles)
      .values({ userId, ...profileData })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...profileData, updatedAt: new Date() },
      })
      .returning();
    return profile;
  }

  // ============================================================================
  // Subscription operations
  // ============================================================================
  
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async updateSubscription(id: string, subscriptionData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async isPro(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    return subscription?.plan === 'pro' && subscription?.status === 'active';
  }

  // ============================================================================
  // Goals operations
  // ============================================================================
  
  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async createGoal(goalData: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(goalData).returning();
    return goal;
  }

  async updateGoal(id: string, goalData: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set({ ...goalData, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  // ============================================================================
  // Favorite Players operations
  // ============================================================================
  
  async getFavoritePlayers(userId: string): Promise<FavoritePlayer[]> {
    return await db.select().from(favoritePlayers).where(eq(favoritePlayers.userId, userId)).orderBy(desc(favoritePlayers.createdAt));
  }

  async createFavoritePlayer(playerData: InsertFavoritePlayer): Promise<FavoritePlayer> {
    const [player] = await db.insert(favoritePlayers).values(playerData).returning();
    return player;
  }

  async deleteFavoritePlayer(id: string): Promise<void> {
    await db.delete(favoritePlayers).where(eq(favoritePlayers.id, id));
  }

  // ============================================================================
  // Notifications operations
  // ============================================================================
  
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // ============================================================================
  // User Settings operations
  // ============================================================================
  
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settingsData: InsertUserSettings): Promise<UserSettings> {
    const [settings] = await db.insert(userSettings).values(settingsData).returning();
    return settings;
  }

  async updateUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const [settings] = await db
      .update(userSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return settings;
  }

  // ============================================================================
  // Player Sync State operations
  // ============================================================================
  
  async getSyncState(userId: string): Promise<PlayerSyncState | undefined> {
    const [state] = await db.select().from(playerSyncState).where(eq(playerSyncState.userId, userId));
    return state;
  }

  async updateSyncState(userId: string): Promise<PlayerSyncState> {
    const [state] = await db
      .insert(playerSyncState)
      .values({ userId, lastSyncedAt: new Date() })
      .onConflictDoUpdate({
        target: playerSyncState.userId,
        set: { lastSyncedAt: new Date() },
      })
      .returning();
    return state;
  }

  // ============================================================================
  // Coach Messages operations
  // ============================================================================
  
  async getCoachMessages(userId: string, limit: number = 50): Promise<CoachMessage[]> {
    return await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userId))
      .orderBy(desc(coachMessages.createdAt))
      .limit(limit);
  }

  async createCoachMessage(messageData: InsertCoachMessage): Promise<CoachMessage> {
    const [message] = await db.insert(coachMessages).values(messageData).returning();
    return message;
  }

  async countCoachMessagesToday(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(coachMessages)
      .where(
        and(
          eq(coachMessages.userId, userId),
          eq(coachMessages.role, 'user'),
          gte(coachMessages.createdAt, todayStart)
        )
      );
    return result[0]?.count || 0;
  }

  // ============================================================================
  // Push Analyses operations
  // ============================================================================
  
  async getPushAnalysis(id: string): Promise<PushAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(pushAnalyses)
      .where(eq(pushAnalyses.id, id));
    return analysis;
  }

  async getLatestPushAnalysis(userId: string): Promise<PushAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(pushAnalyses)
      .where(eq(pushAnalyses.userId, userId))
      .orderBy(desc(pushAnalyses.createdAt))
      .limit(1);
    return analysis;
  }

  async getPushAnalyses(userId: string, limit: number = 10): Promise<PushAnalysis[]> {
    return await db
      .select()
      .from(pushAnalyses)
      .where(eq(pushAnalyses.userId, userId))
      .orderBy(desc(pushAnalyses.createdAt))
      .limit(limit);
  }

  async createPushAnalysis(analysisData: InsertPushAnalysis): Promise<PushAnalysis> {
    const [analysis] = await db.insert(pushAnalyses).values(analysisData).returning();
    return analysis;
  }

  async countPushAnalysesToday(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pushAnalyses)
      .where(
        and(
          eq(pushAnalyses.userId, userId),
          gte(pushAnalyses.createdAt, todayStart)
        )
      );
    return result[0]?.count || 0;
  }

  // ============================================================================
  // Training Plans operations
  // ============================================================================
  
  async getActivePlan(userId: string): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(
        and(
          eq(trainingPlans.userId, userId),
          eq(trainingPlans.status, 'active')
        )
      )
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1);
    return plan;
  }

  async getTrainingPlans(userId: string): Promise<TrainingPlan[]> {
    return await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt));
  }

  async createTrainingPlan(planData: InsertTrainingPlan): Promise<TrainingPlan> {
    const [plan] = await db.insert(trainingPlans).values(planData).returning();
    return plan;
  }

  async updateTrainingPlan(id: string, planData: Partial<InsertTrainingPlan>): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .update(trainingPlans)
      .set({ ...planData, updatedAt: new Date() })
      .where(eq(trainingPlans.id, id))
      .returning();
    return plan;
  }

  async archiveOldPlans(userId: string): Promise<void> {
    await db
      .update(trainingPlans)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(
        and(
          eq(trainingPlans.userId, userId),
          eq(trainingPlans.status, 'active')
        )
      );
  }

  // ============================================================================
  // Training Drills operations
  // ============================================================================
  
  async getDrillsByPlan(planId: string): Promise<TrainingDrill[]> {
    return await db
      .select()
      .from(trainingDrills)
      .where(eq(trainingDrills.planId, planId))
      .orderBy(desc(trainingDrills.priority));
  }

  async createTrainingDrill(drillData: InsertTrainingDrill): Promise<TrainingDrill> {
    const [drill] = await db.insert(trainingDrills).values(drillData).returning();
    return drill;
  }

  async updateTrainingDrill(id: string, drillData: Partial<InsertTrainingDrill>): Promise<TrainingDrill | undefined> {
    const [drill] = await db
      .update(trainingDrills)
      .set({ ...drillData, updatedAt: new Date() })
      .where(eq(trainingDrills.id, id))
      .returning();
    return drill;
  }

  async countActiveDrills(planId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingDrills)
      .where(
        and(
          eq(trainingDrills.planId, planId),
          sql`${trainingDrills.status} != 'completed'`
        )
      );
    return result[0]?.count || 0;
  }

  // ============================================================================
  // Meta Decks Cache operations
  // ============================================================================
  
  async getMetaDecks(): Promise<MetaDeckCache[]> {
    return await db
      .select()
      .from(metaDecksCache)
      .orderBy(desc(metaDecksCache.usageCount));
  }

  async createMetaDeck(deckData: Partial<InsertMetaDeckCache>): Promise<MetaDeckCache> {
    const [deck] = await db
      .insert(metaDecksCache)
      .values(deckData as InsertMetaDeckCache)
      .returning();
    return deck;
  }

  async clearMetaDecks(): Promise<void> {
    await db.delete(metaDecksCache);
  }
}

export const storage = new DatabaseStorage();
