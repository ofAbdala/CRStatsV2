import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PushAnalysisResult {
  summary: string;
  strengths: string[];
  mistakes: string[];
  recommendations: string[];
}

export interface BattleContext {
  gameMode: string;
  playerDeck: string[];
  opponentDeck: string[];
  playerCrowns: number;
  opponentCrowns: number;
  trophyChange: number;
  elixirLeaked: number;
  result: 'win' | 'loss' | 'draw';
}

export interface PushSessionContext {
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
  durationMinutes: number;
  battles: BattleContext[];
}

export async function generateCoachResponse(
  messages: ChatMessage[],
  playerContext?: {
    playerTag?: string;
    trophies?: number;
    arena?: string;
    currentDeck?: string[];
    recentBattles?: any[];
  }
): Promise<string> {
  const systemPrompt = `Você é um coach especialista de Clash Royale, ajudando jogadores a melhorar suas habilidades.

Seu papel é:
- Fornecer dicas estratégicas personalizadas
- Analisar batalhas e decks
- Sugerir melhorias de gameplay
- Explicar matchups e counter-plays
- Dar conselhos sobre progressão no jogo

${playerContext ? `
Contexto do jogador:
- Tag: ${playerContext.playerTag || 'Não informado'}
- Troféus: ${playerContext.trophies || 'Não informado'}
- Arena: ${playerContext.arena || 'Não informado'}
${playerContext.currentDeck ? `- Deck atual: ${playerContext.currentDeck.join(', ')}` : ''}
${playerContext.recentBattles ? `- Batalhas recentes: ${playerContext.recentBattles.length} batalhas registradas` : ''}
` : ''}

Responda sempre em português brasileiro de forma amigável e educativa. Seja conciso mas informativo.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta. Tente novamente.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Falha ao gerar resposta do coach");
  }
}

export async function generatePushAnalysis(
  pushSession: PushSessionContext
): Promise<PushAnalysisResult> {
  const battlesDescription = pushSession.battles.map((b, i) => {
    const resultText = b.result === 'win' ? 'Vitória' : b.result === 'loss' ? 'Derrota' : 'Empate';
    return `Batalha ${i + 1}: ${resultText} (${b.playerCrowns}-${b.opponentCrowns}) | Modo: ${b.gameMode} | Troféus: ${b.trophyChange > 0 ? '+' : ''}${b.trophyChange} | Elixir vazado: ${b.elixirLeaked.toFixed(1)}
    Seu deck: ${b.playerDeck.join(', ')}
    Deck oponente: ${b.opponentDeck.join(', ')}`;
  }).join('\n\n');

  const systemPrompt = `Você é um coach especialista de Clash Royale analisando uma sessão de push (sequência de batalhas ranqueadas jogadas em um curto período).

Sua tarefa é analisar a sessão de push e fornecer feedback estruturado baseado nos dados fornecidos.

Sessão de Push:
- Total de batalhas: ${pushSession.battles.length}
- Vitórias: ${pushSession.wins} | Derrotas: ${pushSession.losses}
- Taxa de vitória: ${pushSession.winRate.toFixed(1)}%
- Troféus líquidos: ${pushSession.netTrophies > 0 ? '+' : ''}${pushSession.netTrophies}
- Duração: ${pushSession.durationMinutes} minutos

Detalhes das batalhas:
${battlesDescription}

Analise os matchups, os resultados, e o elixir vazado para identificar padrões.

IMPORTANTE: Responda APENAS com um JSON válido no formato abaixo, sem texto adicional:
{
  "summary": "Resumo de 2-3 frases sobre a sessão de push",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "mistakes": ["erro 1", "erro 2", "erro 3"],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}

Regras:
- summary: Seja específico sobre o desempenho geral da sessão
- strengths: Identifique até 3 pontos fortes baseados nos matchups vencidos e padrões positivos
- mistakes: Identifique até 3 erros ou áreas de melhoria, considere elixir vazado alto como indicador de erros
- recommendations: Dê até 3 ações específicas e práticas para melhorar

Responda em português brasileiro.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analise esta sessão de push e forneça o feedback estruturado." },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]) as PushAnalysisResult;
      
      return {
        summary: parsed.summary || "Não foi possível gerar um resumo.",
        strengths: (parsed.strengths || []).slice(0, 3),
        mistakes: (parsed.mistakes || []).slice(0, 3),
        recommendations: (parsed.recommendations || []).slice(0, 3),
      };
    } catch (parseError) {
      console.error("Failed to parse push analysis JSON:", parseError, content);
      return {
        summary: "Sessão de push analisada. Verifique seus replays para mais detalhes.",
        strengths: ["Você completou a sessão de push"],
        mistakes: ["Não foi possível identificar erros específicos"],
        recommendations: ["Continue praticando e prestando atenção nos matchups"],
      };
    }
  } catch (error) {
    console.error("OpenAI API error in push analysis:", error);
    throw new Error("Falha ao gerar análise de push");
  }
}
