import { Progress } from "@/components/ui/progress";
import { Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getArenaImageUrl } from "@/lib/clashIcons";

const ARENAS = [
  { id: 1, name: "Goblin Stadium", minTrophies: 0 },
  { id: 2, name: "Bone Pit", minTrophies: 300 },
  { id: 3, name: "Barbarian Bowl", minTrophies: 600 },
  { id: 4, name: "Spell Valley", minTrophies: 1000 },
  { id: 5, name: "Builder's Workshop", minTrophies: 1300 },
  { id: 6, name: "Royal Arena", minTrophies: 1600 },
  { id: 7, name: "Frozen Peak", minTrophies: 2000 },
  { id: 8, name: "Jungle Arena", minTrophies: 2300 },
  { id: 9, name: "Hog Mountain", minTrophies: 2600 },
  { id: 10, name: "Electro Valley", minTrophies: 3000 },
  { id: 11, name: "Party Beach", minTrophies: 3300 },
  { id: 12, name: "Spooky Town", minTrophies: 3600 },
  { id: 13, name: "Rascal's Hideout", minTrophies: 4000 },
  { id: 14, name: "Serenity Peak", minTrophies: 4300 },
  { id: 15, name: "Miner's Mine", minTrophies: 4600 },
  { id: 16, name: "Executioner's Kitchen", minTrophies: 5000 },
  { id: 17, name: "Royal Crypt", minTrophies: 5300 },
  { id: 18, name: "Silent Sanctuary", minTrophies: 5600 },
  { id: 19, name: "Dragon Spa", minTrophies: 6000 },
  { id: 20, name: "Corrupted Cove", minTrophies: 6600 },
  { id: 21, name: "Goblin's Cage", minTrophies: 7000 },
  { id: 22, name: "Boot Camp", minTrophies: 7500 },
  { id: 23, name: "Clash Fest", minTrophies: 8000 },
  { id: 24, name: "PANCAKES!", minTrophies: 8500 },
  { id: 25, name: "Valkalla", minTrophies: 9000 },
  { id: 26, name: "Legendary Arena", minTrophies: 9500 },
  { id: 27, name: "Trophy Road Max", minTrophies: 10500 },
  { id: 28, name: "Champion League", minTrophies: 11975 },
];

export function getArenaForTrophies(trophies: number) {
  for (let i = ARENAS.length - 1; i >= 0; i--) {
    if (trophies >= ARENAS[i].minTrophies) {
      return ARENAS[i];
    }
  }
  return ARENAS[0];
}

export function getNextArena(currentArenaId: number) {
  const currentIndex = ARENAS.findIndex(a => a.id === currentArenaId);
  if (currentIndex === -1 || currentIndex >= ARENAS.length - 1) {
    return null;
  }
  return ARENAS[currentIndex + 1];
}

interface ArenaProgressBarProps {
  trophies: number;
  arenaId?: number;
  arenaName?: string;
  compact?: boolean;
}

export function ArenaProgressBar({ 
  trophies, 
  arenaId, 
  arenaName,
  compact = false 
}: ArenaProgressBarProps) {
  const currentArena = arenaId 
    ? ARENAS.find(a => a.id === arenaId) || getArenaForTrophies(trophies)
    : getArenaForTrophies(trophies);
    
  const nextArena = getNextArena(currentArena.id);
  
  const progressInArena = nextArena 
    ? trophies - currentArena.minTrophies
    : trophies - currentArena.minTrophies;
    
  const arenaRange = nextArena 
    ? nextArena.minTrophies - currentArena.minTrophies
    : 500;
    
  const progressPercent = nextArena 
    ? Math.min(100, Math.max(0, (progressInArena / arenaRange) * 100))
    : 100;
    
  const trophiesToNext = nextArena 
    ? nextArena.minTrophies - trophies
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="arena-progress-compact">
        <img 
          src={getArenaImageUrl(currentArena.id)} 
          alt={arenaName || currentArena.name}
          className="w-6 h-6 object-contain"
        />
        <div className="flex-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        {nextArena && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {trophiesToNext} 🏆
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-3" data-testid="arena-progress-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={getArenaImageUrl(currentArena.id)} 
            alt={arenaName || currentArena.name}
            className="w-12 h-12 object-contain"
          />
          <div>
            <h4 className="font-semibold text-foreground">{arenaName || currentArena.name}</h4>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-500" />
              {trophies.toLocaleString()} troféus
            </p>
          </div>
        </div>
        
        {nextArena && (
          <div className="flex items-center gap-2 text-right">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Próxima arena</p>
              <p className="text-sm font-medium text-primary">{nextArena.name}</p>
            </div>
            <img 
              src={getArenaImageUrl(nextArena.id)} 
              alt={nextArena.name}
              className="w-10 h-10 object-contain opacity-60"
            />
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={progressPercent} 
          className={cn(
            "h-3",
            progressPercent >= 80 && "bg-yellow-500/20"
          )}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentArena.minTrophies.toLocaleString()}</span>
          {nextArena ? (
            <span className={cn(
              trophiesToNext <= 100 && "text-yellow-500 font-semibold"
            )}>
              Faltam {trophiesToNext} troféus para {nextArena.name}
            </span>
          ) : (
            <span className="text-primary font-semibold">Nível máximo! 🏆</span>
          )}
          <span>{nextArena?.minTrophies.toLocaleString() || '∞'}</span>
        </div>
      </div>
    </div>
  );
}
