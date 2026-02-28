import { useMemo, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage, getApiTechnicalDetails } from "@/lib/errorMessages";

interface PageErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  showReload?: boolean;
}

export default function PageErrorState({
  title,
  description,
  error,
  onRetry,
  showReload = true,
}: PageErrorStateProps) {
  const { t } = useLocale();
  const [showDetails, setShowDetails] = useState(false);

  const technical = useMemo(() => getApiTechnicalDetails(error), [error]);
  const defaultDescription = useMemo(
    () => getApiErrorMessage(error, t, "errors.generic"),
    [error, t],
  );

  return (
    <div className="min-h-[240px] flex items-center justify-center py-6">
      <Card className="max-w-xl w-full border-destructive/40 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title || t("errorBoundary.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {description || defaultDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("errorBoundary.retry")}
              </Button>
              {showReload ? (
                <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("errorBoundary.reload")}
                </Button>
              ) : null}
            </div>

            {technical ? (
              <div className="pt-1">
                <Button
                  variant="link"
                  className="px-0 h-auto text-xs"
                  onClick={() => setShowDetails((current) => !current)}
                >
                  {showDetails ? t("errorBoundary.hideDetails") : t("errorBoundary.showDetails")}
                </Button>
                {showDetails ? (
                  <pre className="text-xs font-mono bg-destructive/10 rounded p-2 overflow-auto">
{`code: ${technical.code}
status: ${technical.status}
requestId: ${technical.requestId || "-"}
message: ${technical.message}`}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
