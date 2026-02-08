import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TiltLevel = "high" | "medium" | "none";

export interface PlayerSyncResponse {
  status: "ok" | "partial" | "error";
  partial: boolean;
  syncedTag: string | null;
  player: any | null;
  battles: any[];
  pushSessions: any[];
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    streak: { type: "win" | "loss" | "none"; count: number };
    tiltLevel: TiltLevel;
  };
  goals: any[];
  lastSyncedAt: string | null;
  errors: Array<{
    source: "profile" | "player" | "battlelog" | "goals";
    code: string;
    message: string;
    status?: number;
  }>;
}

export function usePlayerSync() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["player-sync"],
    queryFn: () => api.player.sync() as Promise<PlayerSyncResponse>,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const derivedStatus = useMemo(() => {
    if (query.isLoading) return "loading" as const;
    if (query.isError) return "error" as const;
    if (!query.data) return "loading" as const;
    if (query.data.status === "partial") return "partial" as const;
    if (query.data.status === "error") return "error" as const;
    return "ok" as const;
  }, [query.data, query.isError, query.isLoading]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["player-sync"] });
    return query.refetch();
  };

  return {
    ...query,
    sync: query.data,
    derivedStatus,
    lastSyncedAt: query.data?.lastSyncedAt ?? null,
    refresh,
  };
}

