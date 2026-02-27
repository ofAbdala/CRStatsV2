import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/use-locale';

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
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: Partial<UserSettingsResponse>) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: t("settings.toast.updateSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t("settings.toast.updateError", { message: error.message }),
      });
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) => api.notificationPreferences.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: t("settings.toast.preferencesUpdateSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t("settings.toast.preferencesUpdateError", { message: error.message }),
      });
    },
  });
}
