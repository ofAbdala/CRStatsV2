import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface SyncData {
  player: any;
  battles: any[];
  pushSessions: any[];
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    streak: { type: 'wins' | 'losses' | 'none'; count: number };
    tiltLevel: 'high' | 'medium' | 'none';
  };
  lastSyncedAt: string;
  goals: any[];
}

export function usePlayerSync() {
  const queryClient = useQueryClient();
  
  const syncStateQuery = useQuery({
    queryKey: ["syncState"],
    queryFn: async () => {
      const res = await fetch("/api/player/sync-state", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncData> => {
      const res = await fetch("/api/player/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syncState"] });
      queryClient.invalidateQueries({ queryKey: ["clashPlayer"] });
      queryClient.invalidateQueries({ queryKey: ["clashBattles"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    syncState: syncStateQuery.data,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
    syncData: syncMutation.data,
    sync: syncMutation.mutate,
    lastSyncedAt: syncStateQuery.data?.lastSyncedAt,
  };
}
