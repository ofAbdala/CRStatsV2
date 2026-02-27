/**
 * Vercel serverless function entry point.
 *
 * Vercel routes all requests to this file via the rewrites in vercel.json.
 * At build time, `npm run build` produces `dist/index.cjs` which bundles the
 * full Express app. This module re-exports the default serverless handler
 * from that bundle.
 *
 * See: server/index.ts → `export default async function handler(req, res)`
 */

// @ts-expect-error dist/index.cjs is generated at build time
import built from "../dist/index.cjs";

export default (built as any).default;
