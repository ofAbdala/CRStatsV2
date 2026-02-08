import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  contextKey?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const contextKeyMap: Record<string, string> = {
  global: "errorBoundary.context.global",
  dashboard: "errorBoundary.context.dashboard",
  me: "errorBoundary.context.me",
  coach: "errorBoundary.context.coach",
  training: "errorBoundary.context.training",
  billing: "errorBoundary.context.billing",
  notifications: "errorBoundary.context.notifications",
};

function DefaultBoundaryFallback({
  error,
  onRetry,
  contextKey,
}: {
  error?: Error;
  onRetry: () => void;
  contextKey?: string;
}) {
  const { t } = useLocale();
  const [showDetails, setShowDetails] = useState(false);
  const contextDescriptionKey = contextKey ? contextKeyMap[contextKey] : undefined;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{t("errorBoundary.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {contextDescriptionKey ? t(contextDescriptionKey) : t("errorBoundary.description")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("errorBoundary.retry")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("errorBoundary.reload")}
              </Button>
            </div>

            {error ? (
              <div className="space-y-2">
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto text-xs"
                  onClick={() => setShowDetails((current) => !current)}
                >
                  {showDetails ? t("errorBoundary.hideDetails") : t("errorBoundary.showDetails")}
                </Button>
                {showDetails ? (
                  <pre className="text-xs text-destructive/80 font-mono bg-destructive/10 p-2 rounded overflow-auto">
                    {error.message}
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

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", {
      contextKey: this.props.contextKey || "unknown",
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultBoundaryFallback
          error={this.state.error}
          contextKey={this.props.contextKey}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
