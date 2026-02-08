import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useClearNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { useLocale } from "@/hooks/use-locale";

function formatNotificationDate(dateValue: string, locale: "pt-BR" | "en-US") {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: locale === "pt-BR" ? ptBR : enUS,
  });
}

export default function NotificationsPage() {
  const { t, locale } = useLocale();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const clearNotificationsMutation = useClearNotifications();

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleClearAll = () => {
    const confirmed = window.confirm(t("notifications.clearConfirm"));
    if (!confirmed) return;
    clearNotificationsMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{t("notifications.title")}</h1>
            <p className="text-muted-foreground">
              {t("notifications.subtitle", { count: notifications.length })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {t("notifications.unreadBadge", { count: unreadCount })}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={markAllReadMutation.isPending || notifications.length === 0}
              onClick={() => markAllReadMutation.mutate()}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="w-4 h-4 mr-2" />
              )}
              {t("notifications.markAllRead")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={clearNotificationsMutation.isPending || notifications.length === 0}
              onClick={handleClearAll}
            >
              {clearNotificationsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {t("notifications.clearAll")}
            </Button>
          </div>
        </div>

        {notificationsQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("notifications.loading")}
            </CardContent>
          </Card>
        ) : notificationsQuery.isError ? (
          <PageErrorState
            title={t("notifications.errorTitle")}
            description={t("notifications.errorDescription")}
            error={notificationsQuery.error}
            onRetry={() => notificationsQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>{t("notifications.emptyTitle")}</p>
              <p className="text-sm">{t("notifications.emptyDescription")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">{t("notifications.listTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    notification.read ? "border-border/40 bg-background/30" : "border-primary/40 bg-primary/5"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      {notification.description ? (
                        <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatNotificationDate(notification.createdAt, locale)}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      {!notification.read ? (
                        <Badge className="text-xs">{t("notifications.unread")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t("notifications.read")}
                        </Badge>
                      )}
                      {!notification.read ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                        >
                          {t("notifications.markRead")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
