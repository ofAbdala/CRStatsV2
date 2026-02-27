import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/use-locale";

/**
 * Auth guard wrapper for private routes.
 *
 * - Shows a loading spinner while authentication state is resolving.
 * - Redirects unauthenticated users to `/auth`.
 * - Renders children when the user is authenticated.
 *
 * Used by `App.tsx` to define each private route exactly once instead of
 * duplicating every route in an `isAuthenticated` conditional block (TD-021).
 */
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}
