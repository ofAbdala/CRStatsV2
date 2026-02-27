import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/use-locale';

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.favorites.list(),
  });
}

export function useCreateFavorite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: any) => api.favorites.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: t('hooks.favorites.addSuccessTitle'),
        description: t('hooks.favorites.addSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.favorites.addErrorTitle'),
        description: t('hooks.favorites.addErrorDescription', { message: error.message }),
      });
    },
  });
}

export function useDeleteFavorite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => api.favorites.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: t('hooks.favorites.removeSuccessTitle'),
        description: t('hooks.favorites.removeSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.favorites.removeErrorTitle'),
        description: t('hooks.favorites.removeErrorDescription', { message: error.message }),
      });
    },
  });
}
