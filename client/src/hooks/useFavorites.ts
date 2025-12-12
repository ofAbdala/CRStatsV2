import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.favorites.list(),
  });
}

export function useCreateFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.favorites.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Jogador adicionado aos favoritos!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar favorito: ${error.message}`);
    },
  });
}

export function useDeleteFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.favorites.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Jogador removido dos favoritos!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover favorito: ${error.message}`);
    },
  });
}
