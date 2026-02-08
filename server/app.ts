import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let stripeInitPromise: Promise<void> | null = null;

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }

  if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
    console.warn("Stripe connector not available, skipping Stripe initialization");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({
      databaseUrl,
    });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    console.log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "Managed webhook for Stripe sync",
      },
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log("Syncing Stripe data...");
    stripeSync
      .syncBackfill()
      .then(() => {
        console.log("Stripe data synced");
      })
      .catch((err: any) => {
        console.error("Error syncing Stripe data:", err);
      });
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}

function ensureStripeInit() {
  if (!stripeInitPromise) {
    stripeInitPromise = initStripe();
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createApp(options?: { enableViteInDevelopment?: boolean }) {
  const app = express();
  const httpServer = createServer(app);
  const enableViteInDevelopment = options?.enableViteInDevelopment ?? true;

  ensureStripeInit();

  app.use((req, res, next) => {
    const headerValue = req.headers["x-request-id"];
    const requestId =
      typeof headerValue === "string"
        ? headerValue
        : Array.isArray(headerValue) && typeof headerValue[0] === "string"
          ? headerValue[0]
          : randomUUID();

    (req as any).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.post(
    "/api/stripe/webhook/:uuid",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const requestId = (req as any).requestId;
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({
          code: "STRIPE_SIGNATURE_MISSING",
          message: "Missing stripe-signature",
          requestId,
        });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error(
            JSON.stringify({
              provider: "stripe",
              route: "/api/stripe/webhook/:uuid",
              code: "STRIPE_WEBHOOK_PAYLOAD_INVALID",
              message: "req.body is not a Buffer",
              requestId,
            }),
          );
          return res.status(400).json({
            code: "STRIPE_WEBHOOK_PAYLOAD_INVALID",
            message: "Invalid webhook payload",
            requestId,
          });
        }

        const { uuid } = req.params;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

        return res.status(200).json({ received: true, requestId });
      } catch (error: any) {
        console.error(
          JSON.stringify({
            provider: "stripe",
            route: "/api/stripe/webhook/:uuid",
            code: "STRIPE_WEBHOOK_PROCESSING_FAILED",
            message: error?.message || "Webhook processing error",
            requestId,
          }),
        );
        return res.status(400).json({
          code: "STRIPE_WEBHOOK_PROCESSING_FAILED",
          message: "Webhook processing error",
          requestId,
        });
      }
    },
  );

  app.use(
    express.json({
      type: (req) => !(req.url ?? "").startsWith("/api/stripe/webhook"),
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        const requestId = (req as any).requestId;
        if (requestId) {
          logLine += ` [requestId=${requestId}]`;
        }
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");

    res.status(status).json({
      code,
      message,
      details: err.details,
      requestId: (req as any).requestId,
    });

    console.error(
      JSON.stringify({
        route: req.path,
        userId: (req as any)?.user?.claims?.sub ?? "anonymous",
        provider: "internal",
        status,
        code,
        message,
        requestId: (req as any).requestId,
      }),
    );
    console.error("Unhandled application error:", err);
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else if (enableViteInDevelopment) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  return { app, httpServer };
}
