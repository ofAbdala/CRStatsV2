const ROYALE_API_CDN = 'https://cdn.royaleapi.com/static';

export function getCardImageUrl(cardName: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const slug = cardName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const sizeMap = {
    small: 'cards-75',
    medium: 'cards-150',
    large: 'cards',
  };
  
  return `${ROYALE_API_CDN}/${sizeMap[size]}/${slug}.png`;
}

export function getCardImageFromApi(iconUrl?: { medium?: string; small?: string }): string | null {
  return iconUrl?.medium || iconUrl?.small || null;
}

export function getArenaImageUrl(arenaId: number): string {
  let simpleId = arenaId;
  if (arenaId >= 54000000) {
    simpleId = arenaId - 54000000;
  }
  
  if (simpleId >= 1 && simpleId <= 22) {
    return `${ROYALE_API_CDN}/img/arenas/arena${simpleId}.png`;
  }
  
  if (simpleId >= 23) {
    return `${ROYALE_API_CDN}/img/leagues/league1.png`;
  }
  
  return `${ROYALE_API_CDN}/img/arenas/arena1.png`;
}

export function getArenaImageByName(arenaName: string): string {
  const arenaMap: Record<string, number> = {
    'Goblin Stadium': 1,
    'Bone Pit': 2,
    'Barbarian Bowl': 3,
    "P.E.K.K.A's Playhouse": 4,
    'Spell Valley': 5,
    "Builder's Workshop": 6,
    'Royal Arena': 7,
    'Frozen Peak': 8,
    'Jungle Arena': 9,
    'Hog Mountain': 10,
    'Electro Valley': 11,
    'Spooky Town': 12,
    'Rascals Hideout': 13,
    'Serenity Peak': 14,
    "Miner's Mine": 15,
    "Executioner's Kitchen": 16,
    'Royal Crypt': 17,
    'Silent Sanctuary': 18,
    'Dragon Spa': 19,
    'Boot Camp': 20,
    'Clash Fest': 21,
    'Legendary Arena': 22,
  };
  
  const arenaId = arenaMap[arenaName] || 1;
  return getArenaImageUrl(arenaId);
}

export function getGameModeIcon(gameMode: string): string {
  const modeIcons: Record<string, string> = {
    'Ladder': '🏆',
    'PathOfLegend': '⚔️',
    'Challenge': '🎯',
    'Tournament': '🏅',
    'ClanWar': '⚔️',
    'Friendly': '🤝',
    'SpecialEvent': '🎉',
    '2v2': '👥',
    'Draft': '🎲',
    'TripleDraft': '🎲',
    'SuddenDeath': '💀',
    'DoubleElixir': '💧',
    'TripleElixir': '💧💧',
    'Rage': '😡',
    'Mirror': '🪞',
  };
  
  return modeIcons[gameMode] || '🎮';
}

export function getClanBadgeUrl(badgeId: number): string {
  return `${ROYALE_API_CDN}/badges/${badgeId}.png`;
}

export function getLeagueImageUrl(league: string): string {
  const leagueSlug = league
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${ROYALE_API_CDN}/leagues/${leagueSlug}.png`;
}

export function getCardRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    'Common': '#B0B0B0',
    'Rare': '#FFA500',
    'Epic': '#9B30FF',
    'Legendary': '#FFD700',
    'Champion': '#00BFFF',
  };
  
  return colors[rarity] || '#FFFFFF';
}

export function getElixirCostColor(cost: number): string {
  if (cost <= 2) return '#4CAF50';
  if (cost <= 4) return '#2196F3';
  if (cost <= 6) return '#9C27B0';
  return '#F44336';
}

export const CARD_BACK_URL = `${ROYALE_API_CDN}/cards-150/card-back.png`;
