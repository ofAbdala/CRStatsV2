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
      const { priceId } = req.body;

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
  // AI COACH ROUTES
  // ============================================================================
  
  app.post('/api/coach/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messages, playerTag } = req.body as { 
        messages: ChatMessage[]; 
        playerTag?: string;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
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
      
      res.json({ 
        message: aiResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in coach chat:", error);
      res.status(500).json({ error: "Failed to generate coach response" });
    }
  });

  return httpServer;
}
