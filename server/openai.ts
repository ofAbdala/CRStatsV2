import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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
