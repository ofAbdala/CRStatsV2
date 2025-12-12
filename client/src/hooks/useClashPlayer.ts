import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useClashPlayer(tag: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['clash-player', tag],
    queryFn: () => {
      if (!tag) throw new Error('Player tag is required');
      return api.clash.getPlayer(tag);
    },
    enabled: enabled && !!tag,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useClashBattles(tag: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['clash-battles', tag],
    queryFn: () => {
      if (!tag) throw new Error('Player tag is required');
      return api.clash.getBattles(tag);
    },
    enabled: enabled && !!tag,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useClashCards() {
  return useQuery({
    queryKey: ['clash-cards'],
    queryFn: () => api.clash.getCards(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
