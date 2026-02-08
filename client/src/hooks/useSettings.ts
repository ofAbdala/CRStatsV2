import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { detectLocale, t } from "@shared/i18n";

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

function resolveLocale() {
  if (typeof window === "undefined") {
    return "pt-BR" as const;
  }

  const localStorageLocale = window.localStorage.getItem("locale");
  if (localStorageLocale === "pt-BR" || localStorageLocale === "en-US") {
    return localStorageLocale;
  }

  return detectLocale(window.navigator.language);
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
      const locale = resolveLocale();
      toast.success(t("settings.toast.updateSuccess", locale));
    },
    onError: (error: Error) => {
      const locale = resolveLocale();
      toast.error(t("settings.toast.updateError", locale, { message: error.message }));
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
      const locale = resolveLocale();
      toast.success(t("settings.toast.preferencesUpdateSuccess", locale));
    },
    onError: (error: Error) => {
      const locale = resolveLocale();
      toast.error(t("settings.toast.preferencesUpdateError", locale, { message: error.message }));
    },
  });
}
