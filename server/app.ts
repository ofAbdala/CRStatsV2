import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { randomUUID } from "crypto";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
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
        userId: (req as any)?.auth?.userId ?? "anonymous",
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
