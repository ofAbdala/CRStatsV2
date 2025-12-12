// From javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  profiles,
  subscriptions,
  goals,
  favoritePlayers,
  notifications,
  userSettings,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
      .update(profiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
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
}

export const storage = new DatabaseStorage();
