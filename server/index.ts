import type { Express } from "express";
import { createApp, log } from "./app";

let appPromise: Promise<Express> | null = null;

async function getServerlessApp() {
  if (!appPromise) {
    appPromise = createApp({ enableViteInDevelopment: false }).then(
      ({ app }) => app,
    );
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getServerlessApp();
  return app(req, res);
}

async function start() {
  const { httpServer } = await createApp();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: false,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
}

// Vercel runs the API as a serverless function, so we must not bind to a port there.
if (process.env.VERCEL !== "1") {
  start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
