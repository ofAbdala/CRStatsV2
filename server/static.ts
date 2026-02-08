import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const candidatePaths = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
  ];
  const distPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!distPath) {
    throw new Error(
      `Could not find a build directory. Checked: ${candidatePaths.join(", ")}. Make sure to build the client first`,
    );
  }

  const indexHtmlPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  // Serve hashed Vite assets with immutable caching and strict 404 behavior.
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      fallthrough: false,
      immutable: true,
      maxAge: "365d",
    }),
  );

  // Serve other static files (favicon, etc.) but do not auto-serve index.html from here.
  app.use(
    express.static(distPath, {
      index: false,
      fallthrough: true,
      maxAge: 0,
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.get("*", (req, res) => {
    // Never respond with HTML for missing file requests (prevents old hashed assets from returning index.html).
    if (path.extname(req.path)) {
      return res.status(404).end();
    }

    res.setHeader("Cache-Control", "no-store");
    return res.type("html").send(indexHtml);
  });
}
