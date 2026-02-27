/**
 * SEO constants — arena definitions, card catalog, URL slugs.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 */

// ── Arena definitions ────────────────────────────────────────────────────────

export interface ArenaDefinition {
  id: number;
  name: string;
  slug: string;
  trophyRange: string;
}

export const ARENA_CATALOG: ArenaDefinition[] = [
  { id: 10, name: "Hog Mountain", slug: "hog-mountain", trophyRange: "3000-3399" },
  { id: 11, name: "Electro Valley", slug: "electro-valley", trophyRange: "3400-3799" },
  { id: 12, name: "Spooky Town", slug: "spooky-town", trophyRange: "3800-4199" },
  { id: 13, name: "Rascal's Hideout", slug: "rascals-hideout", trophyRange: "4200-4599" },
  { id: 14, name: "Serenity Peak", slug: "serenity-peak", trophyRange: "4600-4999" },
  { id: 15, name: "Miner's Mine", slug: "miners-mine", trophyRange: "5000-5299" },
  { id: 16, name: "Executioner's Kitchen", slug: "executioners-kitchen", trophyRange: "5300-5599" },
  { id: 17, name: "Royal Crypt", slug: "royal-crypt", trophyRange: "5600-5999" },
  { id: 18, name: "Silent Sanctuary", slug: "silent-sanctuary", trophyRange: "6000-6299" },
  { id: 19, name: "Dragon Spa", slug: "dragon-spa", trophyRange: "6300-6599" },
  { id: 20, name: "Legendary Arena", slug: "legendary-arena", trophyRange: "6600-6999" },
  { id: 54, name: "Legendary Arena (Top)", slug: "legendary-arena-top", trophyRange: "7000+" },
];

export function getArenaBySlug(slug: string): ArenaDefinition | undefined {
  return ARENA_CATALOG.find((a) => a.slug === slug);
}

export function getArenaById(id: number): ArenaDefinition | undefined {
  return ARENA_CATALOG.find((a) => a.id === id);
}

// ── Card definitions for counter pages ──────────────────────────────────────

export interface CardDefinition {
  name: string;
  slug: string;
  description: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Champion";
}

export const CARD_CATALOG: CardDefinition[] = [
  { name: "Golem", slug: "golem", description: "Slow but powerful tank that splits into Golemites on death. High hitpoints make it one of the strongest win conditions in beatdown decks.", rarity: "Epic" },
  { name: "Mega Knight", slug: "mega-knight", description: "A powerful troop that deals splash damage on deploy and when jumping. Feared for his ability to shut down pushes instantly.", rarity: "Legendary" },
  { name: "Hog Rider", slug: "hog-rider", description: "Fast melee troop that targets buildings. The most popular win condition in the game, used in cycle and bridgespam decks.", rarity: "Rare" },
  { name: "Royal Giant", slug: "royal-giant", description: "Ranged building-targeting troop with long range. Excels at chip damage and can be devastating when supported.", rarity: "Common" },
  { name: "Giant", slug: "giant", description: "High hitpoint tank that targets buildings. The backbone of beatdown decks, used to soak damage while support troops deal damage behind.", rarity: "Rare" },
  { name: "Lava Hound", slug: "lava-hound", description: "Flying tank that splits into Lava Pups on death. The anchor of air-based beatdown strategies.", rarity: "Legendary" },
  { name: "P.E.K.K.A", slug: "pekka", description: "Extremely high damage single-target troop. The ultimate tank killer, used defensively to shred large units.", rarity: "Epic" },
  { name: "Balloon", slug: "balloon", description: "Flying building-targeting troop that deals massive damage. Often paired with Lava Hound or Lumberjack for devastating pushes.", rarity: "Epic" },
  { name: "Graveyard", slug: "graveyard", description: "Spell that spawns Skeletons in an area over time. A unique win condition that can overwhelm opponents who lack the right counters.", rarity: "Legendary" },
  { name: "Miner", slug: "miner", description: "Can be deployed anywhere on the arena. Versatile mini-tank used for chip damage and tanking for small troops.", rarity: "Legendary" },
  { name: "X-Bow", slug: "x-bow", description: "Long-range building that targets both ground and air. The cornerstone of siege decks that play defensively.", rarity: "Epic" },
  { name: "Mortar", slug: "mortar", description: "Long-range building that lobs explosive shells. Used in siege and bait decks for chip damage on towers.", rarity: "Common" },
  { name: "Three Musketeers", slug: "three-musketeers", description: "Three powerful ranged troops deployed together. High risk, high reward — devastating when split but vulnerable to spells.", rarity: "Rare" },
  { name: "Electro Giant", slug: "electro-giant", description: "Tank that reflects damage back to attackers. Punishes troops that attack it, making it tricky to defend against.", rarity: "Epic" },
  { name: "Goblin Giant", slug: "goblin-giant", description: "Giant carrying Spear Goblins that deploy on death. A versatile tank used in Sparky and bridgespam decks.", rarity: "Epic" },
  { name: "Giant Skeleton", slug: "giant-skeleton", description: "Tank that drops a bomb on death. Great for defense and can be devastating on offense if it reaches the tower.", rarity: "Epic" },
  { name: "Sparky", slug: "sparky", description: "Slow-charging troop that deals massive area damage. High risk but devastating if it locks onto a tower.", rarity: "Legendary" },
  { name: "Inferno Dragon", slug: "inferno-dragon", description: "Flying troop with a ramping damage beam. Melts tanks but vulnerable to swarm units and zap spells.", rarity: "Legendary" },
  { name: "Lumberjack", slug: "lumberjack", description: "Fast melee troop that drops a Rage spell on death. Often paired with Balloon for devastating Lumberloon pushes.", rarity: "Legendary" },
  { name: "Night Witch", slug: "night-witch", description: "Spawns Bats and summons more on death. Key support troop in Golem beatdown decks.", rarity: "Legendary" },
  { name: "Bandit", slug: "bandit", description: "Dashes to targets and is invulnerable during the dash. A versatile bridge spam card with high skill ceiling.", rarity: "Legendary" },
  { name: "Magic Archer", slug: "magic-archer", description: "Ranged troop whose arrows pierce through all enemies in a line. Excels at chip damage through units to hit towers.", rarity: "Legendary" },
  { name: "Ram Rider", slug: "ram-rider", description: "Charges at buildings while snaring nearby troops. A unique win condition that combines offense and defense.", rarity: "Legendary" },
  { name: "Mother Witch", slug: "mother-witch", description: "Turns defeated enemies into cursed Hogs. Devastating against swarm decks and Graveyard.", rarity: "Legendary" },
  { name: "Archer Queen", slug: "archer-queen", description: "Champion that can turn invisible while dealing high damage. One of the most versatile champions in the game.", rarity: "Champion" },
  { name: "Golden Knight", slug: "golden-knight", description: "Champion that dashes between enemies. His chain dash ability can clear entire pushes.", rarity: "Champion" },
  { name: "Skeleton King", slug: "skeleton-king", description: "Champion that absorbs souls and summons a skeleton army. Devastating ability when charged up.", rarity: "Champion" },
  { name: "Mighty Miner", slug: "mighty-miner", description: "Champion that drops a bomb when recalled. Unique mechanic allows repositioning and area denial.", rarity: "Champion" },
  { name: "Monk", slug: "monk", description: "Champion that can reflect projectiles back at attackers. His ability makes him a counter to many spells and troops.", rarity: "Champion" },
  { name: "Phoenix", slug: "phoenix", description: "Flying troop that revives from an egg after death. Must be killed twice, making it a resilient air unit.", rarity: "Legendary" },
  { name: "Little Prince", slug: "little-prince", description: "Champion with a guardian ability. Versatile unit that works in many deck types with his unique mechanic.", rarity: "Champion" },
  { name: "Elite Barbarians", slug: "elite-barbarians", description: "Two fast, hard-hitting barbarians. Powerful punish card that demands an immediate response.", rarity: "Common" },
  { name: "Goblin Barrel", slug: "goblin-barrel", description: "Spell that throws Goblins anywhere on the arena. The core of log bait strategies.", rarity: "Epic" },
  { name: "Witch", slug: "witch", description: "Ranged splash troop that spawns Skeletons. Popular in mid-ladder for her versatility.", rarity: "Epic" },
  { name: "Wizard", slug: "wizard", description: "Ranged splash troop with high damage. A powerful defensive card that can support pushes.", rarity: "Rare" },
  { name: "Valkyrie", slug: "valkyrie", description: "Melee splash troop that spins to hit all surrounding enemies. One of the best defensive mini-tanks.", rarity: "Rare" },
  { name: "Prince", slug: "prince", description: "Melee troop that charges for double damage. A classic win condition that punishes opponents who ignore him.", rarity: "Epic" },
  { name: "Dark Prince", slug: "dark-prince", description: "Melee splash troop with a shield. Pairs perfectly with Prince for the deadly dual Prince push.", rarity: "Epic" },
  { name: "Electro Wizard", slug: "electro-wizard", description: "Ranged troop that stuns enemies with each attack. Versatile defensive unit that counters Inferno and Sparky.", rarity: "Legendary" },
  { name: "Ice Wizard", slug: "ice-wizard", description: "Ranged troop that slows enemies with each attack. Great defensive support that makes pushes easier to handle.", rarity: "Legendary" },
];

export function getCardBySlug(slug: string): CardDefinition | undefined {
  return CARD_CATALOG.find((c) => c.slug === slug);
}

export function getCardByName(name: string): CardDefinition | undefined {
  const normalized = name.trim().toLowerCase();
  return CARD_CATALOG.find((c) => c.name.toLowerCase() === normalized);
}

// ── Base URL ────────────────────────────────────────────────────────────────

export const BASE_URL = process.env.SITE_URL || "https://crstats.app";
