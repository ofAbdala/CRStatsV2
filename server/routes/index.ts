/**
 * Route orchestrator — mounts all domain route modules onto the Express app.
 *
 * Domain modules:
 *   seo.ts          — SEO server-rendered HTML pages: meta, counter, player, sitemap, robots (5 endpoints)
 *   auth.ts         — authentication, profile, subscription (5 endpoints)
 *   goals.ts        — goal CRUD (4 endpoints)
 *   favorites.ts    — favorite players (3 endpoints)
 *   notifications.ts — notifications + preferences (6 endpoints)
 *   settings.ts     — user settings (2 endpoints)
 *   player.ts       — player sync, history (3 endpoints)
 *   billing.ts      — Stripe checkout, webhook, portal, invoices (8 endpoints)
 *   coach.ts        — AI coach chat, push analysis (4 endpoints)
 *   training.ts     — training plans, drills (5 endpoints)
 *   community.ts    — rankings (2 endpoints)
 *   public.ts       — public Clash Royale API proxy (5 endpoints)
 *   decks.ts        — meta decks, counter, optimizer (4 endpoints)
 *   cron/index.ts   — cron job endpoints: retention, meta-refresh (2 endpoints)
 *
 * Total: 58 route registrations (53 unique + backwards-compatible aliases + Stripe webhook)
 */
import { type Express } from "express";
import { type Server } from "http";

import seoRouter from "./seo";
import authRouter from "./auth";
import goalsRouter from "./goals";
import favoritesRouter from "./favorites";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";
import playerRouter from "./player";
import billingRouter from "./billing";
import coachRouter from "./coach";
import trainingRouter from "./training";
import communityRouter from "./community";
import publicRouter from "./public";
import decksRouter from "./decks";
import cronRouter from "../cron/index";
import healthRouter from "./health";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // SEO routes MUST be mounted FIRST — they serve HTML pages at /meta/*, /counter/*,
  // /player/*, /sitemap.xml, and /robots.txt. These must be handled before the SPA
  // catch-all (Story 2.3).
  app.use(seoRouter);

  app.use(authRouter);
  app.use(goalsRouter);
  app.use(favoritesRouter);
  app.use(notificationsRouter);
  app.use(settingsRouter);
  app.use(playerRouter);
  app.use(billingRouter);
  app.use(coachRouter);
  app.use(trainingRouter);
  app.use(communityRouter);
  app.use(publicRouter);
  app.use(decksRouter);
  app.use(cronRouter);
  app.use(healthRouter);

  return httpServer;
}
