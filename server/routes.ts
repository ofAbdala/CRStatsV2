// From javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getPlayerByTag, getPlayerBattles, getCards } from "./clashRoyaleApi";
import { generateCoachResponse, ChatMessage } from "./openai";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { sql } from "drizzle-orm";

const FREE_DAILY_LIMIT = 5;

function computeTiltLevel(battles: any[]): 'high' | 'medium' | 'none' {
  if (!battles || battles.length === 0) return 'none';
  
  const last10 = battles.slice(0, 10);
  
  let wins = 0;
  let losses = 0;
  let netTrophies = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;
  
  for (const battle of last10) {
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    const trophyChange = battle.team?.[0]?.trophyChange || 0;
    
    if (isVictory) {
      wins++;
      consecutiveLosses = 0;
    } else {
      losses++;
      consecutiveLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    }
    netTrophies += trophyChange;
  }
  
  const winRate = last10.length > 0 ? (wins / last10.length) * 100 : 50;
  
  if (maxConsecutiveLosses >= 3 || (winRate < 40 && netTrophies <= -60)) {
    return 'high';
  }
  
  if (winRate >= 40 && winRate <= 50 && netTrophies < 0) {
    return 'medium';
  }
  
  return 'none';
}

interface PushSession {
  startTime: Date;
  endTime: Date;
  battles: any[];
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
}

function computePushSessions(battles: any[]): PushSession[] {
  if (!battles || battles.length < 2) return [];
  
  const sortedBattles = [...battles].sort((a, b) => 
    new Date(b.battleTime).getTime() - new Date(a.battleTime).getTime()
  );
  
  const sessions: PushSession[] = [];
  let currentSession: any[] = [];
  
  for (let i = 0; i < sortedBattles.length; i++) {
    const battle = sortedBattles[i];
    const battleTime = new Date(battle.battleTime);
    
    if (currentSession.length === 0) {
      currentSession.push(battle);
    } else {
      const lastBattle = currentSession[currentSession.length - 1];
      const lastBattleTime = new Date(lastBattle.battleTime);
      const timeDiff = lastBattleTime.getTime() - battleTime.getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (timeDiff <= thirtyMinutes) {
        currentSession.push(battle);
      } else {
        if (currentSession.length >= 2) {
          sessions.push(createSessionFromBattles(currentSession));
        }
        currentSession = [battle];
      }
    }
  }
  
  if (currentSession.length >= 2) {
    sessions.push(createSessionFromBattles(currentSession));
  }
  
  return sessions;
}

function createSessionFromBattles(battles: any[]): PushSession {
  let wins = 0;
  let losses = 0;
  let netTrophies = 0;
  
  for (const battle of battles) {
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    const trophyChange = battle.team?.[0]?.trophyChange || 0;
    
    if (isVictory) {
      wins++;
    } else {
      losses++;
    }
    netTrophies += trophyChange;
  }
  
  const battleTimes = battles.map(b => new Date(b.battleTime));
  const startTime = new Date(Math.min(...battleTimes.map(t => t.getTime())));
  const endTime = new Date(Math.max(...battleTimes.map(t => t.getTime())));
  
  return {
    startTime,
    endTime,
    battles,
    wins,
    losses,
    winRate: battles.length > 0 ? (wins / battles.length) * 100 : 0,
    netTrophies,
  };
}

function computeBattleStats(battles: any[]) {
  if (!battles || battles.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      streak: { type: 'none' as const, count: 0 },
      tiltLevel: 'none' as const,
    };
  }
  
  let wins = 0;
  let losses = 0;
  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  let currentStreakType: 'win' | 'loss' | null = null;
  
  for (let i = 0; i < battles.length; i++) {
    const battle = battles[i];
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    
    if (isVictory) {
      wins++;
      if (currentStreakType === 'win') {
        streakCount++;
      } else if (currentStreakType === null) {
        currentStreakType = 'win';
        streakCount = 1;
      }
    } else {
      losses++;
      if (currentStreakType === 'loss') {
        streakCount++;
      } else if (currentStreakType === null) {
        currentStreakType = 'loss';
        streakCount = 1;
      }
    }
    
    if (i === 0) {
      streakType = isVictory ? 'win' : 'loss';
      streakCount = 1;
      currentStreakType = streakType;
    } else if (currentStreakType !== null) {
      const prevIsVictory = battles[i - 1].team?.[0]?.crowns > battles[i - 1].opponent?.[0]?.crowns;
      if ((isVictory && prevIsVictory) || (!isVictory && !prevIsVictory)) {
        if (i === 1 || streakType === (isVictory ? 'win' : 'loss')) {
          streakCount++;
        }
      } else {
        break;
      }
    }
  }
  
  let currentStreak = 0;
  let currentType: 'win' | 'loss' | 'none' = 'none';
  for (const battle of battles) {
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    const battleType = isVictory ? 'win' : 'loss';
    
    if (currentType === 'none') {
      currentType = battleType;
      currentStreak = 1;
    } else if (currentType === battleType) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return {
    totalMatches: battles.length,
    wins,
    losses,
    winRate: battles.length > 0 ? (wins / battles.length) * 100 : 0,
    streak: { type: currentType, count: currentStreak },
    tiltLevel: computeTiltLevel(battles),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get associated data
      const profile = await storage.getProfile(userId);
      const subscription = await storage.getSubscription(userId);
      const settings = await storage.getUserSettings(userId);

      res.json({
        ...user,
        profile,
        subscription,
        settings,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // PROFILE ROUTES
  // ============================================================================
  
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.createProfile({ userId, ...req.body });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.updateProfile(userId, req.body);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ============================================================================
  // SUBSCRIPTION ROUTES
  // ============================================================================
  
  app.get('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        return res.json({ plan: 'free', status: 'inactive' });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // ============================================================================
  // GOALS ROUTES
  // ============================================================================
  
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goal = await storage.createGoal({ userId, ...req.body });
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.patch('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.updateGoal(id, req.body);
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // ============================================================================
  // FAVORITE PLAYERS ROUTES
  // ============================================================================
  
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavoritePlayers(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorite = await storage.createFavoritePlayer({ userId, ...req.body });
      res.json(favorite);
    } catch (error) {
      console.error("Error creating favorite:", error);
      res.status(500).json({ message: "Failed to create favorite" });
    }
  });

  app.delete('/api/favorites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFavoritePlayer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting favorite:", error);
      res.status(500).json({ message: "Failed to delete favorite" });
    }
  });

  // ============================================================================
  // NOTIFICATIONS ROUTES
  // ============================================================================
  
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // ============================================================================
  // USER SETTINGS ROUTES
  // ============================================================================
  
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.updateUserSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ============================================================================
  // CLASH ROYALE API ROUTES
  // ============================================================================
  
  app.get('/api/clash/player/:tag', async (req: any, res) => {
    try {
      const { tag } = req.params;
      const result = await getPlayerByTag(tag);
      
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });

  app.get('/api/clash/player/:tag/battles', async (req: any, res) => {
    try {
      const { tag } = req.params;
      const result = await getPlayerBattles(tag);
      
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching battles:", error);
      res.status(500).json({ error: "Failed to fetch battle history" });
    }
  });

  app.get('/api/clash/cards', async (req: any, res) => {
    try {
      const result = await getCards();
      
      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  // ============================================================================
  // PLAYER SYNC ROUTES
  // ============================================================================
  
  app.post('/api/player/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const profile = await storage.getProfile(userId);
      if (!profile?.clashTag) {
        return res.status(400).json({ 
          error: "No Clash Royale tag linked to your profile",
          code: "NO_CLASH_TAG" 
        });
      }
      
      const playerResult = await getPlayerByTag(profile.clashTag);
      if (playerResult.error) {
        return res.status(playerResult.status).json({ error: playerResult.error });
      }
      
      const battlesResult = await getPlayerBattles(profile.clashTag);
      if (battlesResult.error) {
        return res.status(battlesResult.status).json({ error: battlesResult.error });
      }
      
      const player = playerResult.data as any;
      const battles = (battlesResult.data as any[]) || [];
      
      const pushSessions = computePushSessions(battles);
      const stats = computeBattleStats(battles);
      
      const syncState = await storage.updateSyncState(userId);
      
      const goals = await storage.getGoals(userId);
      
      res.json({
        player: {
          tag: player.tag,
          name: player.name,
          trophies: player.trophies,
          arena: player.arena,
          expLevel: player.expLevel,
          clan: player.clan,
          currentDeck: player.currentDeck,
          bestTrophies: player.bestTrophies,
          wins: player.wins,
          losses: player.losses,
          battleCount: player.battleCount,
        },
        battles,
        pushSessions,
        stats,
        lastSyncedAt: syncState.lastSyncedAt,
        goals,
      });
    } catch (error) {
      console.error("Error syncing player data:", error);
      res.status(500).json({ error: "Failed to sync player data" });
    }
  });

  app.get('/api/player/sync-state', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const syncState = await storage.getSyncState(userId);
      
      res.json({
        lastSyncedAt: syncState?.lastSyncedAt || null,
      });
    } catch (error) {
      console.error("Error fetching sync state:", error);
      res.status(500).json({ error: "Failed to fetch sync state" });
    }
  });

  // ============================================================================
  // STRIPE BILLING ROUTES
  // ============================================================================
  
  app.get('/api/stripe/config', async (req, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured" });
      }
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error fetching Stripe config:", error);
      res.status(500).json({ error: "Failed to fetch Stripe configuration" });
    }
  });

  app.get('/api/stripe/products', async (req, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured", data: [] });
      }
      const result = await db.execute(
        sql`SELECT * FROM stripe.products WHERE active = true`
      );
      res.json({ data: result.rows });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get('/api/stripe/prices', async (req, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured", data: [] });
      }
      const result = await db.execute(
        sql`SELECT * FROM stripe.prices WHERE active = true`
      );
      res.json({ data: result.rows });
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.get('/api/stripe/products-with-prices', async (req, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured", data: [] });
      }
      const result = await db.execute(
        sql`
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.active as product_active,
            p.metadata as product_metadata,
            pr.id as price_id,
            pr.unit_amount,
            pr.currency,
            pr.recurring,
            pr.active as price_active
          FROM stripe.products p
          LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.active = true
          ORDER BY p.id, pr.unit_amount
        `
      );

      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching products with prices:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post('/api/stripe/checkout', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const userId = req.user.claims.sub;
      const { priceId, currency } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const customerId = await stripeService.getOrCreateCustomer(userId, user.email || '');

      const domains = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domains ? `https://${domains}` : (process.env.APP_BASE_URL || 'http://localhost:5000');
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/billing?success=true`,
        `${baseUrl}/billing?canceled=true`,
        userId
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const domains = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domains ? `https://${domains}` : (process.env.APP_BASE_URL || 'http://localhost:5000');
      const session = await stripeService.createCustomerPortalSession(
        subscription.stripeCustomerId,
        `${baseUrl}/billing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create customer portal session" });
    }
  });

  // ============================================================================
  // STRIPE WEBHOOK ROUTES (for subscription activation)
  // ============================================================================
  
  app.post('/api/stripe/webhook', async (req: any, res) => {
    try {
      const event = req.body;
      
      if (!event || !event.type) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      console.log(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data?.object;
          if (session?.metadata?.userId && session?.subscription) {
            const userId = session.metadata.userId;
            const subscription = await storage.getSubscription(userId);
            
            if (subscription) {
              await storage.updateSubscription(subscription.id, {
                stripeSubscriptionId: session.subscription,
                plan: 'pro',
                status: 'active',
              });
              console.log(`PRO activated for user: ${userId}`);
            }
          }
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscriptionData = event.data?.object;
          if (subscriptionData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
            if (existing) {
              const status = subscriptionData.status === 'active' ? 'active' : 
                            subscriptionData.status === 'canceled' ? 'canceled' : 
                            subscriptionData.status;
              await storage.updateSubscription(existing.id, {
                status: status,
              });
              console.log(`Subscription ${subscriptionData.id} updated to: ${status}`);
            }
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscriptionData = event.data?.object;
          if (subscriptionData?.id) {
            const existing = await storage.getSubscriptionByStripeId(subscriptionData.id);
            if (existing) {
              await storage.updateSubscription(existing.id, {
                plan: 'free',
                status: 'canceled',
              });
              console.log(`Subscription ${subscriptionData.id} canceled`);
            }
          }
          break;
        }
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================================================
  // AI COACH ROUTES
  // ============================================================================
  
  app.post('/api/coach/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const isPro = await storage.isPro(userId);
      
      if (!isPro) {
        const messagesToday = await storage.countCoachMessagesToday(userId);
        if (messagesToday >= FREE_DAILY_LIMIT) {
          return res.status(403).json({ 
            error: "Daily message limit reached. Upgrade to PRO for unlimited coaching.",
            code: "FREE_COACH_DAILY_LIMIT_REACHED",
            limit: FREE_DAILY_LIMIT,
            used: messagesToday,
          });
        }
      }
      
      const { messages, playerTag, contextType } = req.body as { 
        messages: ChatMessage[]; 
        playerTag?: string;
        contextType?: string;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return res.status(400).json({ error: "At least one user message is required" });
      }

      let playerContext: any = {};

      try {
        if (playerTag) {
          const playerResult = await getPlayerByTag(playerTag);
          if (playerResult.data) {
            const player = playerResult.data as any;
            playerContext = {
              playerTag: player.tag,
              trophies: player.trophies,
              arena: player.arena?.name,
              currentDeck: player.currentDeck?.map((c: any) => c.name),
            };

            const battlesResult = await getPlayerBattles(playerTag);
            if (battlesResult.data) {
              playerContext.recentBattles = (battlesResult.data as any[]).slice(0, 5);
            }
          }
        } else {
          const profile = await storage.getProfile(userId);
          if (profile?.clashTag) {
            const playerResult = await getPlayerByTag(profile.clashTag);
            if (playerResult.data) {
              const player = playerResult.data as any;
              playerContext = {
                playerTag: player.tag,
                trophies: player.trophies,
                arena: player.arena?.name,
                currentDeck: player.currentDeck?.map((c: any) => c.name),
              };
            }
          }
        }
      } catch (contextError) {
        console.warn("Failed to fetch player context, continuing without it:", contextError);
      }

      const aiResponse = await generateCoachResponse(messages, playerContext);
      
      await storage.createCoachMessage({
        userId,
        role: 'user',
        content: lastUserMessage.content,
        contextType: contextType || null,
      });
      
      await storage.createCoachMessage({
        userId,
        role: 'assistant',
        content: aiResponse,
        contextType: contextType || null,
      });
      
      const remainingMessages = isPro ? null : FREE_DAILY_LIMIT - (await storage.countCoachMessagesToday(userId));
      
      res.json({ 
        message: aiResponse,
        timestamp: new Date().toISOString(),
        remainingMessages,
      });
    } catch (error) {
      console.error("Error in coach chat:", error);
      res.status(500).json({ error: "Failed to generate coach response" });
    }
  });

  return httpServer;
}
