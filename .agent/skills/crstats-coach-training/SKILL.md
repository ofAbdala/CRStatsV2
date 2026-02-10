---
name: crstats-coach-training
description: >
  AI Coach and Training Center domain knowledge for CRStats.
  Covers coach chat (OpenAI), push analysis, training plan generation, tilt-aware advice,
  FREE vs PRO gating, and drill tracking.
  Load this skill when working on coach, training, or AI-related features.
---

# CRStats — AI Coach & Training Center

> The AI Coach and Training Center are the core premium features of CRStats. They use OpenAI to analyze real battle data and produce personalized coaching and training plans.

---

## 1. AI Coach Chat

**Source:** `server/openai.ts` → `generateCoachResponse()`

### How It Works

1. User sends a message in the coach page (`/coach`)
2. Frontend calls `POST /api/coach/chat` with `{ messages[], playerContext? }`
3. Backend builds a system prompt with player context and calls OpenAI
4. Response is streamed back to the user

### System Prompt

The coach persona is:
- **Language:** Portuguese Brazilian (default) — responds in the user's locale
- **Tone:** Objective, actionable, no fluff ("sem floreios")
- **Context injected:** Player tag, trophies, arena, current deck, recent battles

### Player Context (optional)

```typescript
{
  playerTag?: string;
  trophies?: number;
  arena?: string;
  currentDeck?: string[];
  recentBattles?: unknown[];
}
```

When available, this context makes the coach's advice specific (e.g., "with your Hog Cycle at 6500 trophies, you should focus on...").

### OpenAI Configuration

| Parameter | Value |
|-----------|-------|
| Model | `gpt-4o-mini` |
| Temperature | `0.6` |
| Max Tokens (coach) | `500` |

### FREE vs PRO Gating

| Tier | Daily Limit | Enforcement |
|------|-------------|-------------|
| FREE | **5 messages/day** | `evaluateFreeCoachLimit()` in `syncRules.ts` |
| PRO | **Unlimited** | Subscription check via `storage.isPro()` |

The limit is checked before calling OpenAI. The constant `FREE_DAILY_LIMIT = 5` is defined in `routes.ts`.

### Fallback Behavior

If OpenAI is unavailable, the coach returns a graceful error message:
> "Não consegui processar sua solicitação no momento. Tente novamente em alguns minutos."

---

## 2. Push Analysis

**Source:** `server/openai.ts` → `generatePushAnalysis()`

### What It Is

After a player completes a push session (see `crstats-domain-clash-royale` skill), CRStats can analyze the entire session and produce a structured performance report.

### Input: PushSessionContext

```typescript
{
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
  durationMinutes: number;
  tiltLevel?: "high" | "medium" | "none";
  consecutiveLosses?: number;
  avgTrophyChange?: number;
  avgElixirLeaked?: number;
  modeBreakdown?: Array<{
    mode: string;
    matches: number;
    wins: number;
    losses: number;
    netTrophies: number;
  }>;
  battles: BattleContext[];
}
```

Each `BattleContext` includes: `gameMode`, `playerDeck[]`, `opponentDeck[]`, `playerCrowns`, `opponentCrowns`, `trophyChange`, `elixirLeaked`, `result`.

### Output: PushAnalysisResult

```typescript
{
  summary: string;         // Overall session narrative
  strengths: string[];     // What went well
  mistakes: string[];      // What went wrong
  recommendations: string[]; // Actionable advice
}
```

### AI Parameters

| Parameter | Value |
|-----------|-------|
| Max Tokens | `700` |
| Response format | Strict JSON (no markdown) |
| Validation | `safeParseJson` with shape check |

### Tilt-Aware Analysis

The system prompt explicitly instructs the AI to consider:
- Tilt level and consecutive losses
- Average trophy change trend
- Average elixir leaked (indicator of poor play)
- Mode breakdown (did the player switch modes when tilting?)

### Fallback (deterministic)

If OpenAI fails, `fallbackPushAnalysis()` returns a pre-written analysis:
- Adapts summary based on `netTrophies >= 0` (positive vs negative session)
- Includes tilt-awareness based on `session.tiltLevel`
- Generic but relevant strengths, mistakes, and recommendations

### Persistence

Analysis results are stored in the `push_analyses` table and can be reused for training plan generation.

---

## 3. Training Plan Generation

**Source:** `server/openai.ts` → `generateTrainingPlan()`

### What It Is

From a push analysis, CRStats generates a structured training plan with specific drills. This is the core of the **Training Center** (`/training`).

### Input

```typescript
analysis: PushAnalysisResult;  // From push analysis
playerContext?: {
  trophies?: number;
  arena?: string;
  currentDeck?: string[];
};
```

### Output: GeneratedTrainingPlan

```typescript
{
  title: string;
  drills: TrainingPlanDrill[];
}
```

Each drill:

```typescript
{
  focusArea: string;     // e.g., "Elixir management"
  description: string;   // What to practice
  targetGames: number;   // How many games (min 1)
  mode: string;          // "ladder", "classic_challenge", etc.
  priority: number;      // 1 = highest priority
}
```

### AI Parameters

| Parameter | Value |
|-----------|-------|
| Max Tokens | `800` |
| Response format | Strict JSON |
| Validation | Shape check + field sanitization |

### Fallback (deterministic)

`fallbackTrainingPlan()` generates a 3-drill plan:
1. **First drill** targets the player's top mistake from analysis
2. **Second drill** focuses on decision-making in unfavorable matchups
3. **Third drill** focuses on spell timing and cycle execution

### How Advice Should Adapt to Tilt

| Tilt Level | Coaching Strategy |
|------------|------------------|
| `high` | **Stop playing.** Recommend a break (2+ hours). Drill focus on mental reset. |
| `medium` | **Slow down.** Suggest shorter sessions (~3 matches). Focus on one win condition. |
| `none` | **Push forward.** Encourage longer sessions. Focus on improvement areas. |

---

## 4. Training Center (Frontend)

**Page:** `/training` | **Source:** `client/src/pages/training.tsx`

### User Flow

1. User plays matches → syncs data
2. CRStats computes push sessions
3. User requests push analysis → AI generates report
4. From report, user generates training plan
5. Plan shows drills with focus areas, target games, mode, priority
6. User tracks drill completion manually

### Data Model

| Table | Key Fields |
|-------|------------|
| `training_plans` | `userId`, `title`, `status` (active/archived/completed), `pushAnalysisId` |
| `training_drills` | `planId`, `focusArea`, `description`, `targetGames`, `mode`, `priority`, `status`, `completedGames` |

### Plan Lifecycle

```
Push Analysis → Generate Plan → Active → Track Drills → Complete/Archive
```

Status transitions: `active` → `completed` (all drills done) or `archived` (manually).

---

## 5. Coach Messages Persistence

| Table | Key Fields |
|-------|------------|
| `coach_messages` | `userId`, `role` (user/assistant/system), `content`, `createdAt` |

Messages are stored to maintain conversation history within the session. The frontend sends the full message array on each turn.

---

## 6. Key Implementation Rules

1. **Every AI function has a fallback** — never let a feature break entirely when OpenAI is down
2. **JSON responses are validated** — use `safeParseJson` + `extractJsonObject` for robustness against markdown-wrapped responses
3. **Tilt context must be injected** — push analysis and coach chat should always include tilt level when available
4. **i18n in prompts** — system prompts default to Portuguese but the `language` field in deck functions supports English
5. **No mock responses** — fallback functions produce generic-but-real advice, never placeholder text like "Lorem ipsum"
6. **Rate limit before AI call** — always check FREE daily limit before invoking OpenAI
