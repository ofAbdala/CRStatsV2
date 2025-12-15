import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

interface TiltAlertProps {
  tiltLevel: 'high' | 'medium' | 'none';
  consecutiveLosses?: number;
  className?: string;
}

export function TiltAlert({ tiltLevel, consecutiveLosses, className }: TiltAlertProps) {
  const { t } = useLocale();

  if (tiltLevel === 'none') {
    return (
      <Alert
        className={cn(
          "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
          className
        )}
        data-testid="alert-tilt-none"
      >
        <CheckCircle className="h-4 w-4" />
        <AlertTitle data-testid="text-tilt-title">{t("tilt.noTilt")}</AlertTitle>
        <AlertDescription data-testid="text-tilt-description">
          {t("tilt.noTiltDesc")}
        </AlertDescription>
      </Alert>
    );
  }

  if (tiltLevel === 'medium') {
    return (
      <Alert
        className={cn(
          "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
          className
        )}
        data-testid="alert-tilt-medium"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle data-testid="text-tilt-title">{t("tilt.alertMedium")}</AlertTitle>
        <AlertDescription data-testid="text-tilt-description">
          {t("tilt.alertMediumDesc")}
          {consecutiveLosses && consecutiveLosses > 0 && (
            <span className="block mt-1 font-medium" data-testid="text-consecutive-losses">
              {t("tilt.consecutiveLosses", { n: consecutiveLosses })}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert
      variant="destructive"
      className={cn(
        "border-red-500/50 bg-red-500/10",
        className
      )}
      data-testid="alert-tilt-high"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle data-testid="text-tilt-title">{t("tilt.alertHigh")}</AlertTitle>
      <AlertDescription data-testid="text-tilt-description">
        {t("tilt.alertHighDesc")}
        {consecutiveLosses && consecutiveLosses > 0 && (
          <span className="block mt-1 font-medium" data-testid="text-consecutive-losses">
            {t("tilt.consecutiveLosses", { n: consecutiveLosses })}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
