import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/use-locale';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => api.goals.list(),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: any) => api.goals.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: t('hooks.goals.createSuccessTitle'),
        description: t('hooks.goals.createSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.goals.createErrorTitle'),
        description: t('hooks.goals.createErrorDescription', { message: error.message }),
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.goals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: t('hooks.goals.updateSuccessTitle'),
        description: t('hooks.goals.updateSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.goals.updateErrorTitle'),
        description: t('hooks.goals.updateErrorDescription', { message: error.message }),
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => api.goals.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: t('hooks.goals.deleteSuccessTitle'),
        description: t('hooks.goals.deleteSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.goals.deleteErrorTitle'),
        description: t('hooks.goals.deleteErrorDescription', { message: error.message }),
      });
    },
  });
}
