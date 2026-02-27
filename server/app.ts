import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { logger, createRequestLogger } from "./logger";
import { sanitizeBodyMiddleware } from "./middleware/sanitize";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

/**
 * Legacy helper kept for backward compatibility with call-sites that
 * import `log` from `./app`.  New code should use `logger` from `./logger`.
 */
export function log(message: string, source = "express") {
  logger.info(message, { source });
}

export async function createApp(options?: { enableViteInDevelopment?: boolean }) {
  const app = express();
  const httpServer = createServer(app);
  const enableViteInDevelopment = options?.enableViteInDevelopment ?? true;

  // CORS configuration (TD-006)
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "https://crstats.app",
      credentials: true,
    }),
  );

  // Global rate limiting (TD-005)
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // --- Request ID assignment (TD-057) ---
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

  app.use(
    express.json({
      type: (req) => !(req.url ?? "").startsWith("/api/stripe/webhook"),
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  // --- Input sanitization middleware (TD-059 — XSS protection) ---
  // Strips HTML tags from user-submitted text fields before route handlers.
  app.use(sanitizeBodyMiddleware as express.RequestHandler);

  // --- Request logging middleware (TD-057 / AC6, AC8) ---
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    const requestId: string = (req as any).requestId;
    const reqLogger = createRequestLogger(requestId);

    // Attach logger to request so downstream handlers can use it
    (req as any).log = reqLogger;

    if (path.startsWith("/api")) {
      reqLogger.info("request start", { method: req.method, path });
    }

    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        reqLogger.info("request end", {
          method: req.method,
          path,
          status: res.statusCode,
          durationMs: duration,
          ...(capturedJsonResponse ? { responseBody: capturedJsonResponse } : {}),
        });
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  // --- Global error handler ---
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
    const requestId: string | undefined = (req as any).requestId;

    res.status(status).json({
      code,
      message,
      details: err.details,
      requestId,
    });

    const reqLogger = requestId ? createRequestLogger(requestId) : logger;
    reqLogger.error("unhandled application error", {
      route: req.path,
      userId: (req as any)?.auth?.userId ?? "anonymous",
      provider: "internal",
      status,
      code,
      message,
      stack: err.stack,
    });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else if (enableViteInDevelopment) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  return { app, httpServer };
}
