import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';

export interface NotificationPreferences {
  training: boolean;
  billing: boolean;
  system: boolean;
}

export interface UserSettingsResponse {
  userId: string;
  theme?: string;
  preferredLanguage?: string;
  defaultLandingPage?: string;
  showAdvancedStats?: boolean;
  notificationsEnabled?: boolean;
  notificationsTraining?: boolean;
  notificationsBilling?: boolean;
  notificationsSystem?: boolean;
  notificationPreferences?: NotificationPreferences;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get() as Promise<UserSettingsResponse>,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.notificationPreferences.get() as Promise<NotificationPreferences>,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserSettingsResponse>) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Configurações atualizadas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) => api.notificationPreferences.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferências de notificação atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar preferências: ${error.message}`);
    },
  });
}
