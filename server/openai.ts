import OpenAI from "openai";

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

function fallbackPushAnalysis(session: PushSessionContext): PushAnalysisResult {
  const positiveResult = session.netTrophies >= 0;

  return {
    summary: positiveResult
      ? "Sessão estável com bom controle do ritmo."
      : "Sessão com oscilação de performance e perda de consistência.",
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

export async function generateCoachResponse(
  messages: ChatMessage[],
  playerContext?: {
    playerTag?: string;
    trophies?: number;
    arena?: string;
    currentDeck?: string[];
    recentBattles?: unknown[];
  },
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
    console.error("OpenAI coach error:", error);
    return "Não consegui processar sua solicitação no momento. Tente novamente em alguns minutos.";
  }
}

export async function generatePushAnalysis(
  context: PushSessionContext,
): Promise<PushAnalysisResult> {
  const systemPrompt = `Você é um analista de performance de Clash Royale.
Retorne apenas JSON válido no formato:
{"summary":"string","strengths":["..."],"mistakes":["..."],"recommendations":["..."]}
Sem markdown.`;

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
    console.error("OpenAI push analysis error:", error);
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
    console.error("OpenAI training plan error:", error);
    return fallbackTrainingPlan(analysis);
  }
}
