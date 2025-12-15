import { LucideIcon, Trophy, Swords, Zap, Crown, User, Shield, BarChart3, MessageSquare } from "lucide-react";

export interface PlayerStats {
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  arena: string;
  winRate: number;
  cardsFound: number;
  totalDonations: number;
}

export interface Card {
  id: number;
  name: string;
  level: number;
  image: string; // URL placeholder
  elixir: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "champion";
}

export interface Battle {
  id: string;
  result: "victory" | "defeat" | "draw";
  crowns: number;
  opponentCrowns: number;
  opponentName: string;
  opponentTag: string;
  date: string; // ISO string
  trophyChange: number;
  type: "Ladder" | "Challenge" | "Tournament";
  deck: Card[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Mock Cards
export const mockCards: Card[] = [
  { id: 1, name: "Hog Rider", level: 14, elixir: 4, rarity: "rare", image: "https://placehold.co/100x120/orange/white?text=Hog" },
  { id: 2, name: "Fireball", level: 13, elixir: 4, rarity: "rare", image: "https://placehold.co/100x120/orange/white?text=Fireball" },
  { id: 3, name: "Zap", level: 14, elixir: 2, rarity: "common", image: "https://placehold.co/100x120/blue/white?text=Zap" },
  { id: 4, name: "Musketeer", level: 12, elixir: 4, rarity: "rare", image: "https://placehold.co/100x120/orange/white?text=Musk" },
  { id: 5, name: "Cannon", level: 13, elixir: 3, rarity: "common", image: "https://placehold.co/100x120/gray/white?text=Cannon" },
  { id: 6, name: "Ice Spirit", level: 13, elixir: 1, rarity: "common", image: "https://placehold.co/100x120/cyan/white?text=Ice" },
  { id: 7, name: "Skeletons", level: 13, elixir: 1, rarity: "common", image: "https://placehold.co/100x120/gray/white?text=Skellies" },
  { id: 8, name: "Log", level: 11, elixir: 2, rarity: "legendary", image: "https://placehold.co/100x120/purple/white?text=Log" },
];

export const mockBattles: Battle[] = [
  {
    id: "b1",
    result: "victory",
    crowns: 2,
    opponentCrowns: 1,
    opponentName: "xX_Destroyer_Xx",
    opponentTag: "#89U89U",
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    trophyChange: 30,
    type: "Ladder",
    deck: mockCards,
  },
  {
    id: "b2",
    result: "defeat",
    crowns: 0,
    opponentCrowns: 1,
    opponentName: "NoobMaster69",
    opponentTag: "#9090JK",
    date: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    trophyChange: -28,
    type: "Ladder",
    deck: mockCards,
  },
  {
    id: "b3",
    result: "victory",
    crowns: 3,
    opponentCrowns: 0,
    opponentName: "JuanPro",
    opponentTag: "#JJJ888",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    trophyChange: 29,
    type: "Ladder",
    deck: mockCards,
  },
  {
    id: "b4",
    result: "draw",
    crowns: 1,
    opponentCrowns: 1,
    opponentName: "ClashKing",
    opponentTag: "#CK999",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    trophyChange: 0,
    type: "Ladder",
    deck: mockCards,
  },
  {
    id: "b5",
    result: "victory",
    crowns: 1,
    opponentCrowns: 0,
    opponentName: "PrincessLover",
    opponentTag: "#PL123",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    trophyChange: 31,
    type: "Ladder",
    deck: mockCards,
  },
];

export const mockChatHistory: Message[] = [
  {
    id: "m1",
    role: "assistant",
    content: "Olá KingSlayer! Analisei suas últimas batalhas. Parece que você está tendo dificuldades contra decks de Lava Hound. Quer algumas dicas de como posicionar sua Mosqueteira melhor?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "m2",
    role: "user",
    content: "Sim, por favor. Eles sempre conseguem chegar na minha torre.",
    timestamp: new Date(Date.now() - 1000 * 60 * 59).toISOString(),
  },
  {
    id: "m3",
    role: "assistant",
    content: "O segredo é o 'pull'. Use seu Canhão no centro para atrair o Lava Hound, mas guarde a Mosqueteira para o Balão ou as tropas de suporte que vêm atrás. Não gaste seu Gelo/Espírito muito cedo. Tente praticar o posicionamento 4-3 (4 tiles da torre, 3 tiles do rio).",
    timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  }
];

export const mockNotifications = [
  { id: 1, title: "Meta Atualizado", description: "O meta mudou! Veja os novos decks dominantes.", time: "2h atrás", read: false, type: "info" },
  { id: 2, title: "Treino Concluído", description: "Você completou o treino 'Defesa de Corredor'.", time: "5h atrás", read: true, type: "success" },
  { id: 3, title: "Novo Recorde!", description: "Você atingiu 5900 troféus. Parabéns!", time: "1d atrás", read: true, type: "success" },
];

export const mockGoals = [
  { id: 1, title: "Chegar na Arena 18", current: 5842, target: 6000, type: "trophies" },
  { id: 2, title: "Vencer 5 partidas seguidas", current: 3, target: 5, type: "streak" },
];

export const mockFavorites = [
  { tag: "#M0R74L", name: "Mortal", trophies: 7500, clan: "Team Liquid" },
  { tag: "#V1P3R", name: "Viper", trophies: 7200, clan: "SK Gaming" },
];

export const mockRankings = [
  { rank: 1, name: "Mohamed Light", tag: "#LIGHT", trophies: 9000, clan: "Light Clan", winRate: 85 },
  { rank: 2, name: "Mugi", tag: "#MUGI", trophies: 8950, clan: "Crazy Raccoon", winRate: 82 },
  { rank: 3, name: "Ian77", tag: "#IAN", trophies: 8900, clan: "SK Gaming", winRate: 80 },
  { rank: 4, name: "LucasXGamer", tag: "#LUCAS", trophies: 8850, clan: "Team Queso", winRate: 79 },
  { rank: 5, name: "Wallace", tag: "#WALL", trophies: 8800, clan: "SSG", winRate: 78 },
];

