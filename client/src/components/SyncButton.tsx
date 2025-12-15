import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { useLocale } from "@/hooks/use-locale";

interface SyncButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  showLastSync?: boolean;
  className?: string;
}

export function SyncButton({ 
  variant = "outline", 
  size = "default",
  showLastSync = true,
  className 
}: SyncButtonProps) {
  const { sync, isSyncing, lastSyncedAt } = usePlayerSync();
  const { t, locale } = useLocale();

  const handleSync = () => {
    sync(undefined, {
      onSuccess: () => {
        toast.success(t("sync.success"));
      },
      onError: (error) => {
        toast.error(t("sync.error"), {
          description: error.message,
        });
      },
    });
  };

  const getRelativeTime = () => {
    if (!lastSyncedAt) return t("sync.never");
    
    try {
      const date = new Date(lastSyncedAt);
      const distance = formatDistanceToNow(date, { 
        addSuffix: false,
        locale: locale === "pt-BR" ? ptBR : enUS 
      });
      return t("sync.lastSync", { time: distance });
    } catch {
      return t("sync.never");
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={isSyncing}
        className={className}
        data-testid="button-sync"
      >
        {isSyncing ? (
          <>
            <Spinner className="mr-1" />
            <span data-testid="text-syncing">{t("sync.syncing")}</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-1" />
            <span data-testid="text-sync-label">{t("sync.button")}</span>
          </>
        )}
      </Button>
      {showLastSync && lastSyncedAt && (
        <span 
          className="text-xs text-muted-foreground" 
          data-testid="text-last-sync"
        >
          {getRelativeTime()}
        </span>
      )}
    </div>
  );
}
