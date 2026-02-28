/**
 * Mock factories for external services: Storage, Clash Royale API, OpenAI, Stripe.
 *
 * These mocks allow integration tests to run without any real database connections
 * or external API calls. Every storage method returns sensible defaults that can be
 * overridden per-test via `Object.assign(mockStorage, { methodName: ... })`.
 */
import type { IStorage, DbSession } from "../../../server/storage";

// ── Test IDs ────────────────────────────────────────────────────────────────────

export const TEST_USER_ID = "test-user-id-1111";
export const TEST_USER_EMAIL = "testuser@crstats.app";
export const TEST_PLAYER_TAG = "#ABC123";
export const TEST_STRIPE_CUSTOMER_ID = "cus_test_123";
export const TEST_STRIPE_SUBSCRIPTION_ID = "sub_test_456";

// ── Mock Storage Factory ────────────────────────────────────────────────────────

export function createMockStorage(overrides: Partial<IStorage> = {}): IStorage {
  const defaults: IStorage = {
    // Session management
    async withUserSession(fn) {
      return fn({ conn: {} });
    },

    // User operations
    async getUser(id) {
      return { id, email: TEST_USER_EMAIL, createdAt: new Date() } as any;
    },
    async upsertUser(user) {
      return { id: user.id, email: user.email, createdAt: new Date() } as any;
    },
    async bootstrapUserData(userId) {
      return {
        profile: { id: "prof-1", userId, clashTag: TEST_PLAYER_TAG, defaultPlayerTag: TEST_PLAYER_TAG },
        settings: { id: "set-1", userId, theme: "dark" },
        subscription: { id: "sub-1", userId, plan: "free", status: "inactive" },
        notificationPreferences: { id: "np-1", userId, training: true, billing: true, system: true },
      } as any;
    },

    // Profile operations
    async getProfile(userId) {
      return {
        id: "prof-1",
        userId,
        clashTag: TEST_PLAYER_TAG,
        defaultPlayerTag: TEST_PLAYER_TAG,
        displayName: "TestPlayer",
      } as any;
    },
    async createProfile(profile) {
      return { id: "prof-new", ...profile, createdAt: new Date() } as any;
    },
    async updateProfile(userId, data) {
      return { id: "prof-1", userId, ...data } as any;
    },

    // Subscription operations
    async getSubscription(userId) {
      return {
        id: "sub-1",
        userId,
        plan: "free",
        status: "inactive",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      } as any;
    },
    async createSubscription(sub) {
      return { id: "sub-new", ...sub, createdAt: new Date() } as any;
    },
    async updateSubscription(id, data) {
      return { id, ...data } as any;
    },
    async getSubscriptionByStripeId(stripeSubscriptionId) {
      return undefined;
    },
    async isPro() {
      return false;
    },

    // Goals operations
    async getGoals() {
      return [];
    },
    async getGoal(id) {
      return { id, userId: TEST_USER_ID, title: "Test Goal", type: "trophies", targetValue: 5000, currentValue: 0, completed: false } as any;
    },
    async createGoal(goal) {
      return { id: "goal-new", ...goal, createdAt: new Date() } as any;
    },
    async updateGoal(id, data) {
      return { id, ...data } as any;
    },
    async deleteGoal() {},

    // Favorite Players operations
    async getFavoritePlayers() {
      return [];
    },
    async getFavoritePlayer(id) {
      return { id, userId: TEST_USER_ID, playerTag: TEST_PLAYER_TAG, name: "Fav" } as any;
    },
    async createFavoritePlayer(fav) {
      return { id: "fav-new", ...fav, createdAt: new Date() } as any;
    },
    async deleteFavoritePlayer() {},
    async refreshFavoritePlayerData() {},

    // Notifications operations
    async getNotifications() {
      return [];
    },
    async getNotification(id) {
      return { id, userId: TEST_USER_ID, title: "Test", type: "info", read: false } as any;
    },
    async createNotification(n) {
      return { id: "notif-new", ...n, createdAt: new Date() } as any;
    },
    async markNotificationAsRead() {},
    async markAllNotificationsAsRead() {},
    async deleteNotification() {},
    async deleteNotificationsByUser() {},

    // Notification preferences
    async getNotificationPreferences() {
      return { id: "np-1", userId: TEST_USER_ID, training: true, billing: true, system: true } as any;
    },
    async upsertNotificationPreferences(userId, prefs) {
      return { id: "np-1", userId, training: true, billing: true, system: true, ...prefs } as any;
    },

    // User Settings operations
    async getUserSettings(userId) {
      return { id: "set-1", userId, theme: "dark", preferredLanguage: "pt", notificationsEnabled: true } as any;
    },
    async createUserSettings(settings) {
      return { id: "set-new", ...settings } as any;
    },
    async updateUserSettings(userId, data) {
      return { id: "set-1", userId, ...data } as any;
    },

    // Player Sync State
    async getSyncState(userId) {
      return { id: "sync-1", userId, lastSyncedAt: new Date() } as any;
    },
    async updateSyncState(userId) {
      return { id: "sync-1", userId, lastSyncedAt: new Date() } as any;
    },

    // Battle History
    async upsertBattleHistory() {
      return { inserted: 0 };
    },
    async getBattleHistory() {
      return [];
    },
    async pruneBattleHistory() {},

    // Coach Messages
    async getCoachMessages() {
      return [];
    },
    async createCoachMessage(msg) {
      return { id: "cm-new", ...msg, createdAt: new Date() } as any;
    },
    async countCoachMessagesToday() {
      return 0;
    },

    // Push Analyses
    async getPushAnalysis(id) {
      return undefined;
    },
    async getLatestPushAnalysis() {
      return undefined;
    },
    async getPushAnalyses() {
      return [];
    },
    async createPushAnalysis(analysis) {
      return { id: "pa-new", ...analysis, createdAt: new Date() } as any;
    },
    async countPushAnalysesToday() {
      return 0;
    },

    // Training Plans
    async getActivePlan() {
      return undefined;
    },
    async getTrainingPlan(id) {
      return undefined;
    },
    async getTrainingPlans() {
      return [];
    },
    async createTrainingPlan(plan) {
      return { id: "tp-new", ...plan, createdAt: new Date() } as any;
    },
    async updateTrainingPlan(id, data) {
      return { id, ...data } as any;
    },
    async archiveOldPlans() {},

    // Training Drills
    async getTrainingDrill(id) {
      return undefined;
    },
    async getDrillsByPlan() {
      return [];
    },
    async createTrainingDrill(drill) {
      return { id: "td-new", ...drill, createdAt: new Date() } as any;
    },
    async updateTrainingDrill(id, data) {
      return { id, ...data } as any;
    },
    async countActiveDrills() {
      return 0;
    },

    // Meta Decks Cache
    async getMetaDecks() {
      return [];
    },
    async getMetaDecksLastUpdated() {
      return null;
    },
    async replaceMetaDecks() {},
    async createMetaDeck(deck) {
      return { id: "md-new", ...deck } as any;
    },
    async clearMetaDecks() {},

    // Deck suggestions usage
    async countDeckSuggestionsToday() {
      return 0;
    },
    async incrementDeckSuggestionUsage() {},

    // Arena Meta Decks (Story 2.1)
    async getArenaMetaDecks() {
      return [];
    },
    async replaceArenaMetaDecks() {},
    async replaceAllArenaData() {},
    async getArenaCounterDecks() {
      return [];
    },

    // Battle Stats Cache (Story 2.4)
    async upsertBattleStatsCache() {},
    async getBattleStatsCache() {
      return [];
    },
    async clearBattleStatsCache() {},

    // Card Performance (Story 2.4)
    async upsertCardPerformance() {},
    async getCardPerformance() {
      return [];
    },
    async clearCardPerformance() {},

    // Follow operations (Story 2.7)
    async followUser(followerId, followingId) {
      return { id: "follow-new", followerId, followingId, createdAt: new Date() } as any;
    },
    async unfollowUser() {},
    async getFollowing() {
      return [];
    },
    async getFollowers() {
      return [];
    },
    async getFollowingCount() {
      return 0;
    },
    async getFollowersCount() {
      return 0;
    },
    async isFollowing() {
      return false;
    },

    // Deck Vote operations (Story 2.7)
    async voteDeck(userId, deckHash, battleId) {
      return { id: "vote-new", userId, deckHash, battleId, createdAt: new Date() } as any;
    },
    async hasVotedDeck() {
      return false;
    },
    async getDeckVoteCount() {
      return 0;
    },
    async getTopVotedDecks() {
      return [];
    },
  };

  return Object.assign(defaults, overrides);
}

// ── Mock Clash Royale API responses ─────────────────────────────────────────────

export function mockPlayerData(tag = TEST_PLAYER_TAG) {
  return {
    tag,
    name: "TestPlayer",
    trophies: 5500,
    bestTrophies: 6000,
    arena: { name: "Challenger III" },
    expLevel: 13,
    clan: { name: "TestClan" },
    currentDeck: [
      { name: "Hog Rider" },
      { name: "Musketeer" },
      { name: "Ice Spirit" },
      { name: "Skeletons" },
      { name: "Cannon" },
      { name: "Fireball" },
      { name: "The Log" },
      { name: "Ice Golem" },
    ],
    wins: 2000,
    losses: 1800,
    battleCount: 3800,
  };
}

export function mockBattleData() {
  const now = new Date();
  return [
    {
      battleTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      team: [{ crowns: 2, trophyChange: 30, elixirLeaked: 0.5, cards: [{ name: "Hog Rider" }] }],
      opponent: [{ crowns: 1, cards: [{ name: "Giant" }] }],
      gameMode: { name: "Ladder" },
    },
    {
      battleTime: new Date(now.getTime() - 20 * 60 * 1000).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      team: [{ crowns: 1, trophyChange: -28, elixirLeaked: 1.2, cards: [{ name: "Hog Rider" }] }],
      opponent: [{ crowns: 3, cards: [{ name: "Golem" }] }],
      gameMode: { name: "Ladder" },
    },
  ];
}

// ── Mock OpenAI response ────────────────────────────────────────────────────────

export function mockCoachResponse() {
  return "Great game! Focus on your elixir management and try to defend more efficiently.";
}

export function mockDeckCounterResponse() {
  return {
    deck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
    explanation: "This deck counters the target effectively.",
  };
}

export function mockDeckOptimizerResponse() {
  return {
    newDeck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
    explanation: "Optimized for better win rate.",
  };
}
