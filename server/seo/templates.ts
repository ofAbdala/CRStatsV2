/**
 * SEO HTML template functions — generate complete, standalone HTML pages.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 *
 * These pages are server-rendered via Express (NOT React SSR).
 * They produce lightweight HTML with inline CSS — no JS bundles needed.
 */

import { BASE_URL } from "./constants";

// ── Shared types ────────────────────────────────────────────────────────────

interface MetaTagsInput {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: string;
  ogImage?: string;
  keywords?: string;
  dateModified?: string;
}

interface JsonLdInput {
  name: string;
  description: string;
  url: string;
  dateModified?: string;
}

// ── CSS ─────────────────────────────────────────────────────────────────────

const INLINE_CSS = `
  :root {
    --bg: #0f1117;
    --bg-card: #1a1d27;
    --bg-hover: #22263a;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --text-heading: #f8fafc;
    --accent: #6366f1;
    --accent-light: #818cf8;
    --green: #22c55e;
    --yellow: #eab308;
    --red: #ef4444;
    --border: #2d3348;
    --radius: 8px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
  }
  a { color: var(--accent-light); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 1rem; }
  header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  header .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent-light);
    letter-spacing: -0.5px;
  }
  nav { display: flex; gap: 1.25rem; flex-wrap: wrap; }
  nav a { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
  nav a:hover { color: var(--text); text-decoration: none; }
  main { padding: 2rem 0 4rem; }
  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-heading);
    margin-bottom: 0.25rem;
  }
  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-heading);
    margin-top: 2rem;
    margin-bottom: 0.75rem;
  }
  .subtitle {
    color: var(--text-muted);
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }
  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-green { background: rgba(34,197,94,0.15); color: var(--green); }
  .badge-yellow { background: rgba(234,179,8,0.15); color: var(--yellow); }
  .badge-red { background: rgba(239,68,68,0.15); color: var(--red); }
  .badge-accent { background: rgba(99,102,241,0.15); color: var(--accent-light); }

  /* Deck table */
  .deck-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  .deck-table th,
  .deck-table td {
    padding: 0.75rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }
  .deck-table th {
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 60px;
    background: var(--bg);
  }
  .deck-table tr:hover td { background: var(--bg-hover); }
  .deck-cards { display: flex; flex-wrap: wrap; gap: 0.25rem; }
  .card-tag {
    display: inline-block;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .win-rate {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .win-rate-high { color: var(--green); }
  .win-rate-mid { color: var(--yellow); }
  .win-rate-low { color: var(--red); }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
  }
  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }
  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
  }

  /* Card description box */
  .info-box {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .info-box p { color: var(--text-muted); }

  /* Footer */
  footer {
    border-top: 1px solid var(--border);
    padding: 2rem 0;
    color: var(--text-muted);
    font-size: 0.8rem;
    text-align: center;
  }
  footer a { color: var(--text-muted); }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .breadcrumb a { color: var(--text-muted); }
  .breadcrumb span { color: var(--border); }

  /* Arena nav */
  .arena-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .arena-link {
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .arena-link:hover { color: var(--text); border-color: var(--accent); text-decoration: none; }
  .arena-link-active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  /* Limited data banner */
  .limited-banner {
    background: rgba(234,179,8,0.1);
    border: 1px solid rgba(234,179,8,0.3);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: var(--yellow);
  }

  /* Responsive */
  @media (max-width: 768px) {
    h1 { font-size: 1.35rem; }
    .deck-table { font-size: 0.8rem; }
    .deck-table th, .deck-table td { padding: 0.5rem 0.25rem; }
    .card-tag { font-size: 0.65rem; padding: 0.15rem 0.3rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMetaTags(input: MetaTagsInput): string {
  const { title, description, canonicalUrl, ogType = "website", ogImage, keywords, dateModified } = input;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const fullUrl = canonicalUrl.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl}`;

  return `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}">
    <link rel="canonical" href="${escapeHtml(fullUrl)}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:url" content="${escapeHtml(fullUrl)}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="CRStats">
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : ""}
    ${dateModified ? `<meta property="article:modified_time" content="${escapeHtml(dateModified)}">` : ""}
  `;
}

function buildJsonLd(input: JsonLdInput): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${BASE_URL}${input.url}`,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    publisher: {
      "@type": "Organization",
      name: "CRStats",
      url: BASE_URL,
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function buildHeader(): string {
  return `
  <header>
    <div class="container">
      <a href="/" class="logo">CRStats</a>
      <nav>
        <a href="/meta/legendary-arena">Meta Decks</a>
        <a href="/counter/mega-knight">Counter Decks</a>
        <a href="/sitemap.xml">Sitemap</a>
      </nav>
    </div>
  </header>`;
}

function buildFooter(): string {
  const year = new Date().getFullYear();
  return `
  <footer>
    <div class="container">
      <p>&copy; ${year} CRStats &mdash; Clash Royale analytics powered by real battle data.</p>
      <p style="margin-top:0.5rem;">
        <a href="/sitemap.xml">Sitemap</a> &middot;
        <a href="/robots.txt">Robots</a>
      </p>
      <p style="margin-top:0.5rem; font-size:0.7rem;">
        This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.
      </p>
    </div>
  </footer>`;
}

function buildPageShell(meta: MetaTagsInput, jsonLd: JsonLdInput, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${buildMetaTags(meta)}
  ${buildJsonLd(jsonLd)}
  <style>${INLINE_CSS}</style>
</head>
<body>
  ${buildHeader()}
  <main>
    <div class="container">
      ${bodyContent}
    </div>
  </main>
  ${buildFooter()}
</body>
</html>`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatPercentRaw(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function winRateClass(rate: number): string {
  if (rate >= 55) return "win-rate-high";
  if (rate >= 45) return "win-rate-mid";
  return "win-rate-low";
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US");
}

function buildCardTags(cards: string[]): string {
  return cards
    .map((c) => `<span class="card-tag">${escapeHtml(c)}</span>`)
    .join("");
}

// ── Exported page renderers ─────────────────────────────────────────────────

export interface MetaDeckRow {
  rank: number;
  cards: string[];
  winRate: number;
  usageRate: number;
  threeCrownRate: number;
  sampleSize: number;
  archetype: string | null;
}

export interface ArenaMetaPageInput {
  arenaName: string;
  arenaSlug: string;
  arenaId: number;
  trophyRange: string;
  decks: MetaDeckRow[];
  allArenas: { name: string; slug: string }[];
  limitedData?: boolean;
}

export function renderArenaMetaPage(input: ArenaMetaPageInput): string {
  const { arenaName, arenaSlug, trophyRange, decks, allArenas, limitedData } = input;
  const now = new Date().toISOString().split("T")[0];
  const title = `Best Decks for ${arenaName} - CRStats`;
  const description = `Top ${decks.length} meta decks for ${arenaName} (${trophyRange} trophies) in Clash Royale. Win rates, usage rates, and sample sizes from real battle data. Updated daily.`;
  const canonicalUrl = `/meta/${arenaSlug}`;
  const keywords = `Clash Royale, ${arenaName}, best decks, meta decks, win rate, arena ${arenaSlug}, trophy road`;

  const arenaNav = allArenas
    .map((a) => {
      const isActive = a.slug === arenaSlug;
      return `<a href="/meta/${escapeHtml(a.slug)}" class="arena-link${isActive ? " arena-link-active" : ""}">${escapeHtml(a.name)}</a>`;
    })
    .join("");

  const tableRows = decks
    .map(
      (d) => `
      <tr>
        <td>${d.rank}</td>
        <td><div class="deck-cards">${buildCardTags(d.cards)}</div></td>
        <td class="win-rate ${winRateClass(d.winRate)}">${formatPercentRaw(d.winRate)}</td>
        <td>${formatPercent(d.usageRate)}</td>
        <td>${formatPercent(d.threeCrownRate)}</td>
        <td>${formatNumber(d.sampleSize)}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <div class="breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="/meta/${escapeHtml(arenaSlug)}">Meta Decks</a>
      <span>/</span>
      ${escapeHtml(arenaName)}
    </div>

    <h1>Best Decks for ${escapeHtml(arenaName)}</h1>
    <p class="subtitle">Top meta decks for ${escapeHtml(arenaName)} (${escapeHtml(trophyRange)} trophies) &mdash; updated ${now}</p>

    <div class="arena-nav">${arenaNav}</div>

    ${limitedData ? '<div class="limited-banner">Limited data available for this arena. Results may be less accurate. Showing best available data across all arenas.</div>' : ""}

    ${decks.length === 0 ? '<p class="subtitle">No deck data available for this arena yet. Check back soon as we collect more battle data.</p>' : `
    <table class="deck-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Deck</th>
          <th>Win Rate</th>
          <th>Usage Rate</th>
          <th>3-Crown</th>
          <th>Sample Size</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>`}

    <h2>About ${escapeHtml(arenaName)}</h2>
    <div class="info-box">
      <p>${escapeHtml(arenaName)} is the trophy range from ${escapeHtml(trophyRange)} in Clash Royale. The decks shown above are the most successful strategies used by players in this arena, ranked by win rate from real battle data.</p>
    </div>
  `;

  return buildPageShell(
    { title, description, canonicalUrl, keywords, dateModified: now },
    { name: title, description, url: canonicalUrl, dateModified: now },
    body,
  );
}

// ── Counter page ────────────────────────────────────────────────────────────

export interface CounterDeckRow {
  rank: number;
  cards: string[];
  winRateVsTarget: number;
  sampleSize: number;
  threeCrownRate: number;
}

export interface CounterPageInput {
  cardName: string;
  cardSlug: string;
  cardDescription: string;
  cardRarity: string;
  decks: CounterDeckRow[];
  limitedData?: boolean;
}

export function renderCounterPage(input: CounterPageInput): string {
  const { cardName, cardSlug, cardDescription, cardRarity, decks, limitedData } = input;
  const now = new Date().toISOString().split("T")[0];
  const title = `Best Counter Decks for ${cardName} - CRStats`;
  const description = `Top ${decks.length} decks with the highest win rate against ${cardName} in Clash Royale. Real battle data, updated daily.`;
  const canonicalUrl = `/counter/${cardSlug}`;
  const keywords = `Clash Royale, counter ${cardName}, beat ${cardName}, best decks against ${cardName}, counter deck`;

  const tableRows = decks
    .map(
      (d) => `
      <tr>
        <td>${d.rank}</td>
        <td><div class="deck-cards">${buildCardTags(d.cards)}</div></td>
        <td class="win-rate ${winRateClass(d.winRateVsTarget)}">${formatPercentRaw(d.winRateVsTarget)}</td>
        <td>${formatPercent(d.threeCrownRate)}</td>
        <td>${formatNumber(d.sampleSize)}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <div class="breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="/counter/${escapeHtml(cardSlug)}">Counter Decks</a>
      <span>/</span>
      ${escapeHtml(cardName)}
    </div>

    <h1>Best Counter Decks for ${escapeHtml(cardName)}</h1>
    <p class="subtitle">Decks with the highest win rate against ${escapeHtml(cardName)} &mdash; updated ${now}</p>

    <div class="info-box">
      <p><strong>${escapeHtml(cardName)}</strong> <span class="badge badge-accent">${escapeHtml(cardRarity)}</span></p>
      <p style="margin-top:0.5rem;">${escapeHtml(cardDescription)}</p>
    </div>

    ${limitedData ? '<div class="limited-banner">Limited data available. Results aggregated across all arenas. Accuracy improves as more battles are analyzed.</div>' : ""}

    ${decks.length === 0 ? '<p class="subtitle">No counter deck data available for this card yet. Check back soon as we collect more battle data.</p>' : `
    <table class="deck-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Deck</th>
          <th>Win Rate vs ${escapeHtml(cardName)}</th>
          <th>3-Crown</th>
          <th>Sample Size</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>`}

    <h2>How to Counter ${escapeHtml(cardName)}</h2>
    <div class="info-box">
      <p>The decks above have the highest win rate against decks containing ${escapeHtml(cardName)}, based on thousands of real battles. Choose one that fits your play style and trophy range for the best results.</p>
    </div>
  `;

  return buildPageShell(
    { title, description, canonicalUrl, keywords, dateModified: now },
    { name: title, description, url: canonicalUrl, dateModified: now },
    body,
  );
}

// ── Player profile page ─────────────────────────────────────────────────────

export interface PlayerBattle {
  type: string;
  isWin: boolean;
  crowns: number;
  opponentCrowns: number;
  trophyChange: number;
  deck: string[];
}

export interface PlayerPageInput {
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  level: number;
  clan: string | null;
  wins: number;
  losses: number;
  battleCount: number;
  currentDeck: string[];
  recentBattles: PlayerBattle[];
}

export function renderPlayerPage(input: PlayerPageInput): string {
  const { tag, name, trophies, bestTrophies, level, clan, wins, losses, battleCount, currentDeck, recentBattles } = input;
  const now = new Date().toISOString().split("T")[0];
  const cleanTag = tag.replace("#", "");
  const title = `${name} (${tag}) - Player Stats - CRStats`;
  const description = `${name} has ${trophies} trophies (best: ${bestTrophies}). Level ${level}${clan ? `, member of ${clan}` : ""}. View full stats, current deck, and recent battles.`;
  const canonicalUrl = `/player/${cleanTag}`;
  const keywords = `Clash Royale, ${name}, player stats, ${tag}, trophies, deck, battles`;

  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "0.0";

  const battleRows = recentBattles
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.type)}</td>
        <td>${b.isWin ? '<span class="badge badge-green">WIN</span>' : '<span class="badge badge-red">LOSS</span>'}</td>
        <td>${b.crowns} - ${b.opponentCrowns}</td>
        <td style="color: ${b.trophyChange >= 0 ? "var(--green)" : "var(--red)"}">${b.trophyChange >= 0 ? "+" : ""}${b.trophyChange}</td>
        <td><div class="deck-cards">${buildCardTags(b.deck)}</div></td>
      </tr>`,
    )
    .join("");

  const body = `
    <div class="breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      Player
      <span>/</span>
      ${escapeHtml(name)}
    </div>

    <h1>${escapeHtml(name)} <span style="color: var(--text-muted); font-size: 1rem;">${escapeHtml(tag)}</span></h1>
    <p class="subtitle">${clan ? `Member of ${escapeHtml(clan)} &mdash; ` : ""}Level ${level}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Trophies</div>
        <div class="stat-value">${formatNumber(trophies)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Best Trophies</div>
        <div class="stat-value">${formatNumber(bestTrophies)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">${winRate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Battles</div>
        <div class="stat-value">${formatNumber(battleCount)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Wins</div>
        <div class="stat-value" style="color: var(--green)">${formatNumber(wins)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Losses</div>
        <div class="stat-value" style="color: var(--red)">${formatNumber(losses)}</div>
      </div>
    </div>

    ${currentDeck.length > 0 ? `
    <h2>Current Deck</h2>
    <div class="info-box">
      <div class="deck-cards">${buildCardTags(currentDeck)}</div>
    </div>` : ""}

    ${recentBattles.length > 0 ? `
    <h2>Recent Battles</h2>
    <table class="deck-table">
      <thead>
        <tr>
          <th>Mode</th>
          <th>Result</th>
          <th>Crowns</th>
          <th>Trophies</th>
          <th>Deck Used</th>
        </tr>
      </thead>
      <tbody>
        ${battleRows}
      </tbody>
    </table>` : ""}
  `;

  return buildPageShell(
    { title, description, canonicalUrl, keywords, dateModified: now, ogType: "profile" },
    { name: title, description, url: canonicalUrl, dateModified: now },
    body,
  );
}

// ── Deck share page (Story 2.7) ──────────────────────────────────────────────

export interface DeckSharePageInput {
  encodedDeck: string;
  cards: Array<{ name: string; id: number; elixirCost: number }>;
  avgElixir: number;
  copyLink: string | null;
  communityStats?: {
    winRate?: number;
    usageCount?: number;
    threeCrownRate?: number;
  } | null;
}

export function renderDeckSharePage(input: DeckSharePageInput): string {
  const { encodedDeck, cards, avgElixir, copyLink, communityStats } = input;
  const now = new Date().toISOString().split("T")[0];
  const cardNames = cards.map((c) => c.name).join(", ");
  const title = `Shared Deck - ${cards.slice(0, 3).map((c) => c.name).join(", ")}... - CRStats`;
  const description = `Clash Royale deck: ${cardNames}. Average elixir: ${avgElixir}. Copy this deck to your game and view community stats.`;
  const canonicalUrl = `/deck/${encodedDeck}`;
  const keywords = `Clash Royale, deck, shared deck, ${cardNames}`;

  const statsHtml = communityStats
    ? `
    <div class="stats-grid">
      ${communityStats.winRate != null ? `<div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value ${winRateClass(communityStats.winRate)}">${formatPercentRaw(communityStats.winRate)}</div></div>` : ""}
      ${communityStats.usageCount != null ? `<div class="stat-card"><div class="stat-label">Games Played</div><div class="stat-value">${formatNumber(communityStats.usageCount)}</div></div>` : ""}
      ${communityStats.threeCrownRate != null ? `<div class="stat-card"><div class="stat-label">3-Crown Rate</div><div class="stat-value">${formatPercent(communityStats.threeCrownRate)}</div></div>` : ""}
      <div class="stat-card"><div class="stat-label">Avg Elixir</div><div class="stat-value">${avgElixir.toFixed(1)}</div></div>
    </div>`
    : `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Avg Elixir</div><div class="stat-value">${avgElixir.toFixed(1)}</div></div>
      <div class="stat-card"><div class="stat-label">Cards</div><div class="stat-value">8</div></div>
    </div>`;

  const body = `
    <div class="breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      Shared Deck
    </div>

    <h1>Shared Clash Royale Deck</h1>
    <p class="subtitle">Deck shared via CRStats &mdash; ${now}</p>

    <div class="info-box">
      <div class="deck-cards" style="font-size: 1rem; gap: 0.5rem;">
        ${buildCardTags(cards.map((c) => c.name))}
      </div>
    </div>

    ${statsHtml}

    ${copyLink ? `
    <div style="margin: 1.5rem 0;">
      <a href="${escapeHtml(copyLink)}" style="display: inline-block; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: var(--radius); font-weight: 600; font-size: 0.95rem; text-decoration: none;">
        Copy Deck to Game
      </a>
    </div>` : ""}

    <h2>Deck Composition</h2>
    <table class="deck-table">
      <thead>
        <tr>
          <th>Card</th>
          <th>Elixir</th>
        </tr>
      </thead>
      <tbody>
        ${cards.map((c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${c.elixirCost}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;

  return buildPageShell(
    { title, description, canonicalUrl, keywords, dateModified: now },
    { name: title, description, url: canonicalUrl, dateModified: now },
    body,
  );
}

// ── 404 page ────────────────────────────────────────────────────────────────

export function render404Page(message: string): string {
  const title = "Page Not Found - CRStats";
  const description = "The requested page could not be found.";

  const body = `
    <h1>Page Not Found</h1>
    <p class="subtitle">${escapeHtml(message)}</p>
    <p style="margin-top: 1rem;">
      <a href="/meta/legendary-arena">Browse Meta Decks</a> &middot;
      <a href="/counter/mega-knight">Browse Counter Decks</a>
    </p>
  `;

  return buildPageShell(
    { title, description, canonicalUrl: "/" },
    { name: title, description, url: "/" },
    body,
  );
}
