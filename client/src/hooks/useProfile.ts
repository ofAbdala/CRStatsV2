import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/use-locale';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.profile.get(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: any) => api.profile.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: t('hooks.profile.updateSuccessTitle'),
        description: t('hooks.profile.updateSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('hooks.profile.updateErrorTitle'),
        description: t('hooks.profile.updateErrorDescription', { message: error.message }),
      });
    },
  });
}
