/**
 * Sitemap and robots.txt generators — pure functions with no DB dependency.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 */
import { ARENA_CATALOG, CARD_CATALOG, BASE_URL } from "./constants";

// ── Sitemap.xml (AC10) ─────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildSitemapXml(): string {
  const now = new Date().toISOString().split("T")[0];

  const urls: { loc: string; changefreq: string; priority: string }[] = [];

  // Arena meta pages
  for (const arena of ARENA_CATALOG) {
    urls.push({
      loc: `${BASE_URL}/meta/${arena.slug}`,
      changefreq: "daily",
      priority: "0.8",
    });
  }

  // Counter card pages
  for (const card of CARD_CATALOG) {
    urls.push({
      loc: `${BASE_URL}/counter/${card.slug}`,
      changefreq: "daily",
      priority: "0.7",
    });
  }

  const urlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// ── robots.txt (AC11) ───────────────────────────────────────────────────────

export function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /meta/
Allow: /counter/
Allow: /player/
Allow: /sitemap.xml
Disallow: /api/
Disallow: /auth/
Disallow: /settings
Disallow: /billing
Disallow: /coach
Disallow: /training

Sitemap: ${BASE_URL}/sitemap.xml
`;
}
