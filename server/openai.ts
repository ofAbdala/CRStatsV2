import OpenAI from "openai";
import { z } from "zod";

const hasOpenAIConfig =
  Boolean(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) &&
  Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);

const openai = hasOpenAIConfig
  ? new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    })
  : null;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface BattleContext {
  gameMode: string;
  playerDeck: string[];
  opponentDeck: string[];
  playerCrowns: number;
  opponentCrowns: number;
  trophyChange: number;
  elixirLeaked: number;
  result: "win" | "loss" | "draw";
}

export interface PushSessionContext {
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

export interface PushAnalysisResult {
  summary: string;
  strengths: string[];
  mistakes: string[];
  recommendations: string[];
}

export interface TrainingPlanDrill {
  focusArea: string;
  description: string;
  targetGames: number;
  mode: string;
  priority: number;
}

export interface GeneratedTrainingPlan {
  title: string;
  drills: TrainingPlanDrill[];
}

export interface ProviderLogContext {
  requestId?: string;
  userId?: string | null;
  route?: string;
  provider?: string;
}

async function createCompletion(messages: ChatMessage[], maxTokens = 600): Promise<string> {
  if (!hasOpenAIConfig) {
    throw new Error("OpenAI configuration is not available");
  }

  const response = await openai!.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    temperature: 0.6,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || "";
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const start = raw.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i]!;

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
        continue;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return null;
}

function safeParseStrictJson<T>(raw: string): T | null {
  const extracted = extractJsonObject(raw);
  const candidate = extracted ?? raw;
  return safeParseJson<T>(candidate);
}

function fallbackPushAnalysis(session: PushSessionContext): PushAnalysisResult {
  const positiveResult = session.netTrophies >= 0;
  const tiltSentence =
    session.tiltLevel === "high"
      ? "Há sinais fortes de tilt na sessão."
      : session.tiltLevel === "medium"
        ? "Existem sinais moderados de tilt."
        : "Tilt controlado durante a sessão.";

  return {
    summary: positiveResult
      ? `Sessão estável com bom controle do ritmo. ${tiltSentence}`
      : `Sessão com oscilação de performance e perda de consistência. ${tiltSentence}`,
    strengths: [
      "Leitura de partida aceitável nos primeiros minutos.",
      "Capacidade de adaptação quando o matchup é favorável.",
    ],
    mistakes: [
      "Ciclos de elixir inconsistentes em momentos de pressão.",
      "Trocas desfavoráveis de feitiço em defesa reativa.",
    ],
    recommendations: [
      "Jogue blocos curtos de 3 a 5 partidas e pause após duas derrotas seguidas.",
      "Priorize uma única condição de vitória por sessão de treino.",
      "Revise os primeiros 60 segundos das derrotas para corrigir abertura de jogo.",
    ],
  };
}

function fallbackTrainingPlan(analysis: PushAnalysisResult): GeneratedTrainingPlan {
  const firstMistake = analysis.mistakes[0] || "Controle de elixir";

  return {
    title: "Plano de Treino Semanal",
    drills: [
      {
        focusArea: firstMistake,
        description: "Treino focado em reduzir erros repetitivos no início da partida.",
        targetGames: 5,
        mode: "ladder",
        priority: 1,
      },
      {
        focusArea: "Tomada de decisão",
        description: "Simule matchups desfavoráveis e registre decisões de defesa.",
        targetGames: 4,
        mode: "classic_challenge",
        priority: 2,
      },
      {
        focusArea: "Execução",
        description: "Treine posicionamento e timing de feitiços em ciclo curto.",
        targetGames: 6,
        mode: "ladder",
        priority: 3,
      },
    ],
  };
}

function logOpenAIError(operation: string, error: unknown, context?: ProviderLogContext) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      provider: context?.provider || "openai",
      operation,
      route: context?.route,
      userId: context?.userId || "anonymous",
      requestId: context?.requestId,
      message,
      at: new Date().toISOString(),
    }),
  );
}

export async function generateCoachResponse(
  messages: ChatMessage[],
  playerContext?: {
    playerTag?: string;
    trophies?: number;
    arena?: string;
    currentDeck?: string[];
    recentBattles?: unknown[];
  },
  logContext?: ProviderLogContext,
): Promise<string> {
  const systemPrompt = `Você é um coach especialista de Clash Royale.
Responda em português brasileiro, de forma objetiva, acionável e sem floreios.
${playerContext ? `Contexto: ${JSON.stringify(playerContext)}` : ""}`;

  try {
    const result = await createCompletion(
      [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      500,
    );

    return result || "Desculpe, não consegui gerar uma resposta agora.";
  } catch (error) {
    logOpenAIError("coach_chat", error, logContext);
    return "Não consegui processar sua solicitação no momento. Tente novamente em alguns minutos.";
  }
}

export async function generatePushAnalysis(
  context: PushSessionContext,
  logContext?: ProviderLogContext,
): Promise<PushAnalysisResult> {
  const systemPrompt = `Você é um analista de performance de Clash Royale.
Retorne apenas JSON válido no formato:
{"summary":"string","strengths":["..."],"mistakes":["..."],"recommendations":["..."]}
Sem markdown.
Considere métricas agregadas como tilt, sequência de derrotas, variação média de troféus e vazamento médio de elixir.`;

  try {
    const result = await createCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analise esta sessão: ${JSON.stringify(context)}`,
        },
      ],
      700,
    );

    const parsed = safeParseJson<PushAnalysisResult>(result);
    if (!parsed || !parsed.summary) {
      return fallbackPushAnalysis(context);
    }

    return {
      summary: parsed.summary,
      strengths: parsed.strengths || [],
      mistakes: parsed.mistakes || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    logOpenAIError("push_analysis", error, logContext);
    return fallbackPushAnalysis(context);
  }
}

export async function generateTrainingPlan(
  analysis: PushAnalysisResult,
  playerContext?: {
    trophies?: number;
    arena?: string;
    currentDeck?: string[];
  },
  logContext?: ProviderLogContext,
): Promise<GeneratedTrainingPlan> {
  const systemPrompt = `Você cria planos de treino em Clash Royale.
Retorne apenas JSON válido no formato:
{"title":"string","drills":[{"focusArea":"string","description":"string","targetGames":1,"mode":"string","priority":1}]}
Sem markdown.`;

  try {
    const result = await createCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Crie um plano com base em análise ${JSON.stringify(analysis)} e contexto ${JSON.stringify(playerContext || {})}`,
        },
      ],
      800,
    );

    const parsed = safeParseJson<GeneratedTrainingPlan>(result);
    if (!parsed || !parsed.title || !Array.isArray(parsed.drills) || parsed.drills.length === 0) {
      return fallbackTrainingPlan(analysis);
    }

    return {
      title: parsed.title,
      drills: parsed.drills.map((drill, index) => ({
        focusArea: drill.focusArea || `Foco ${index + 1}`,
        description: drill.description || "Prática guiada para melhorar consistência.",
        targetGames: Number.isFinite(drill.targetGames) ? Math.max(1, Math.round(drill.targetGames)) : 3,
        mode: drill.mode || "ladder",
        priority: Number.isFinite(drill.priority) ? Math.max(1, Math.round(drill.priority)) : index + 1,
      })),
    };
  } catch (error) {
    logOpenAIError("training_plan", error, logContext);
    return fallbackTrainingPlan(analysis);
  }
}

// ============================================================================
// DECKS: COUNTER + OPTIMIZER (OpenAI)
// ============================================================================

export type CounterDeckStyle = "balanced" | "cycle" | "heavy";

export interface CounterDeckSuggestionContext {
  targetCardKey: string;
  deckStyle?: CounterDeckStyle;
  candidateDecks: Array<{
    cards: string[];
    avgElixir: number;
    winRateEstimate?: number;
    games?: number;
  }>;
  language?: "pt" | "en";
}

export interface CounterDeckSuggestionResult {
  deck: string[];
  explanation: string;
}

const counterDeckResultSchema = z.object({
  deck: z.array(z.string().trim().min(1)).length(8),
  explanation: z.string().trim().min(1),
});

function fallbackCounterDeckSuggestion(context: CounterDeckSuggestionContext): CounterDeckSuggestionResult {
  const first = context.candidateDecks[0];
  const deck = Array.isArray(first?.cards) ? first.cards.slice(0, 8).map((c) => String(c)) : [];
  const language = context.language === "en" ? "en" : "pt";
  const explanation =
    language === "en"
      ? `Fallback suggestion based on the current meta. It should help handle ${context.targetCardKey} with a ${context.deckStyle ?? "balanced"} plan.`
      : `Sugestao de fallback baseada no meta atual. Deve ajudar a lidar com ${context.targetCardKey} com um plano ${context.deckStyle ?? "balanced"}.`;

  // Ensure we always return 8 strings (route validation may still reject and fallback again).
  while (deck.length < 8) deck.push("Knight");
  return { deck: deck.slice(0, 8), explanation };
}

export async function generateCounterDeckSuggestion(
  context: CounterDeckSuggestionContext,
  logContext?: ProviderLogContext,
): Promise<CounterDeckSuggestionResult> {
  const language = context.language === "en" ? "en" : "pt";
  const systemPrompt =
    language === "en"
      ? `You are a Clash Royale deck expert. Return ONLY valid JSON (no markdown).
Format: {"deck":["Card 1",...,"Card 8"],"explanation":"string"}.
Rules:
- Exactly 8 unique cards (by name).
- Prefer selecting ONE of the provided candidate decks. You may change at most 2 cards.
- Keep the playstyle: cycle (~3.0-3.3 avg elixir), balanced (~3.4-3.9), heavy (~4.2-4.8).
- Explanation must be short and practical (2-5 sentences).`
      : `Voce e um especialista em decks de Clash Royale. Retorne APENAS JSON valido (sem markdown).
Formato: {"deck":["Carta 1",...,"Carta 8"],"explanation":"string"}.
Regras:
- Exatamente 8 cartas unicas (por nome).
- Prefira selecionar UM dos candidateDecks. Voce pode trocar no maximo 2 cartas.
- Respeite o estilo: cycle (~3.0-3.3), balanced (~3.4-3.9), heavy (~4.2-4.8) de elixir medio.
- Explicacao curta e pratica (2-5 frases).`;

  try {
    const result = await createCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Context: ${JSON.stringify({
            targetCardKey: context.targetCardKey,
            deckStyle: context.deckStyle ?? "balanced",
            candidateDecks: context.candidateDecks.slice(0, 10),
          })}`,
        },
      ],
      500,
    );

    const parsed = safeParseStrictJson<unknown>(result);
    const validated = counterDeckResultSchema.safeParse(parsed);
    if (!validated.success) {
      return fallbackCounterDeckSuggestion(context);
    }

    return {
      deck: validated.data.deck.map((c) => String(c).trim()),
      explanation: validated.data.explanation,
    };
  } catch (error) {
    logOpenAIError("deck_counter", error, logContext);
    return fallbackCounterDeckSuggestion(context);
  }
}

export interface DeckOptimizationSuggestionContext {
  currentDeck: string[];
  avgElixirBefore: number;
  goal: "cycle" | "counter-card" | "consistency";
  targetCardKey?: string;
  winCondition?: string | null;
  metaSimilarDecks?: Array<{
    cards: string[];
    avgElixir: number;
    winRateEstimate?: number;
    games?: number;
  }>;
  language?: "pt" | "en";
}

export interface DeckOptimizationSuggestionResult {
  newDeck: string[];
  changes: Array<{ from: string; to: string }>;
  explanation: string;
}

const optimizerResultSchema = z.object({
  newDeck: z.array(z.string().trim().min(1)).length(8),
  changes: z
    .array(
      z.object({
        from: z.string().trim().min(1),
        to: z.string().trim().min(1),
      }),
    )
    .optional(),
  explanation: z.string().trim().min(1),
});

function fallbackOptimizerSuggestion(context: DeckOptimizationSuggestionContext): DeckOptimizationSuggestionResult {
  const deck = Array.isArray(context.metaSimilarDecks) && context.metaSimilarDecks.length > 0
    ? context.metaSimilarDecks[0]!.cards.slice(0, 8).map((c) => String(c))
    : context.currentDeck.slice(0, 8).map((c) => String(c));

  const language = context.language === "en" ? "en" : "pt";
  const explanation =
    language === "en"
      ? "Fallback optimization. Try again later for a more tailored suggestion."
      : "Otimizacao de fallback. Tente novamente mais tarde para uma sugestao mais personalizada.";

  while (deck.length < 8) deck.push("Knight");

  return {
    newDeck: deck.slice(0, 8),
    changes: [],
    explanation,
  };
}

export async function generateDeckOptimizationSuggestion(
  context: DeckOptimizationSuggestionContext,
  logContext?: ProviderLogContext,
): Promise<DeckOptimizationSuggestionResult> {
  const language = context.language === "en" ? "en" : "pt";
  const systemPrompt =
    language === "en"
      ? `You are a Clash Royale deck coach. Return ONLY valid JSON (no markdown).
Format: {"newDeck":["Card 1",...,"Card 8"],"changes":[{"from":"...","to":"..."}],"explanation":"string"}.
Rules:
- Exactly 8 unique cards by name.
- Keep the deck's win condition if provided in context.winCondition (do not remove it).
- For goal="cycle": reduce average elixir by replacing heavy cards with cheaper alternatives.
- For goal="counter-card": include at least one reliable response to context.targetCardKey.
- For goal="consistency": improve synergy and avoid clunky combinations.
- Use metaSimilarDecks as inspiration, not a hard constraint.`
      : `Voce e um coach de decks de Clash Royale. Retorne APENAS JSON valido (sem markdown).
Formato: {"newDeck":["Carta 1",...,"Carta 8"],"changes":[{"from":"...","to":"..."}],"explanation":"string"}.
Regras:
- Exatamente 8 cartas unicas por nome.
- Mantenha a win condition se fornecida em context.winCondition (nao remova).
- Para goal="cycle": reduza elixir medio trocando cartas pesadas por opcoes mais baratas.
- Para goal="counter-card": inclua pelo menos uma resposta confiavel a context.targetCardKey.
- Para goal="consistency": melhore sinergia e evite combinacoes travadas.
- Use metaSimilarDecks como inspiracao, nao como regra.`;

  try {
    const result = await createCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Context: ${JSON.stringify({
            currentDeck: context.currentDeck,
            avgElixirBefore: context.avgElixirBefore,
            goal: context.goal,
            targetCardKey: context.targetCardKey ?? null,
            winCondition: context.winCondition ?? null,
            metaSimilarDecks: (context.metaSimilarDecks ?? []).slice(0, 5),
          })}`,
        },
      ],
      650,
    );

    const parsed = safeParseStrictJson<unknown>(result);
    const validated = optimizerResultSchema.safeParse(parsed);
    if (!validated.success) {
      return fallbackOptimizerSuggestion(context);
    }

    return {
      newDeck: validated.data.newDeck.map((c) => String(c).trim()),
      changes: validated.data.changes ?? [],
      explanation: validated.data.explanation,
    };
  } catch (error) {
    logOpenAIError("deck_optimizer", error, logContext);
    return fallbackOptimizerSuggestion(context);
  }
}
