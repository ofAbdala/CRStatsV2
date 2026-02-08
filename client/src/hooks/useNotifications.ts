import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications.list() as Promise<NotificationItem[]>,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("notifications.toast.markReadErrorTitle"),
        description: getApiErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: t("notifications.toast.markAllReadSuccessTitle"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("notifications.toast.markAllReadErrorTitle"),
        description: getApiErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  return useMutation({
    mutationFn: () => api.notifications.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: t("notifications.toast.clearSuccessTitle"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("notifications.toast.clearErrorTitle"),
        description: getApiErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });
}
