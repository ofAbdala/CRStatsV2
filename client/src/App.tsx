import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocale } from "@/hooks/use-locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import DashboardPage from "@/pages/dashboard";
import CoachPage from "@/pages/coach";
import ProfilePage from "@/pages/profile";
import TrainingPage from "@/pages/training";
import DecksPage from "@/pages/decks";
import CommunityPage from "@/pages/community";
import SettingsPage from "@/pages/settings";
import PublicProfilePage from "@/pages/public-profile";
import BillingPage from "@/pages/billing";
import MePage from "@/pages/me";
import ClanPage from "@/pages/clan";

function RequireClashTag({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();
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

  const hasClashTag = !!(profile as any)?.clashTag;

  if (!hasClashTag) {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}

function Router() {
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

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">{() => isAuthenticated ? <RequireClashTag><DashboardPage /></RequireClashTag> : <LandingPage />}</Route>
      <Route path="/p/:tag" component={PublicProfilePage} />
      <Route path="/clan/:tag" component={ClanPage} />
      
      {/* Protected routes - redirect to login if not authenticated */}
      {isAuthenticated ? (
        <>
          <Route path="/dashboard">{() => <RequireClashTag><DashboardPage /></RequireClashTag>}</Route>
          <Route path="/coach">{() => <RequireClashTag><CoachPage /></RequireClashTag>}</Route>
          <Route path="/training">{() => <RequireClashTag><TrainingPage /></RequireClashTag>}</Route>
          <Route path="/decks">{() => <RequireClashTag><DecksPage /></RequireClashTag>}</Route>
          <Route path="/me">{() => <RequireClashTag><MePage /></RequireClashTag>}</Route>
          <Route path="/community" component={CommunityPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/billing" component={BillingPage} />
        </>
      ) : (
        <>
          <Route path="/dashboard">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/coach">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/training">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/decks">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/community">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/settings">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/profile">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/onboarding">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/billing">{() => { window.location.href = "/api/login"; return null; }}</Route>
          <Route path="/me">{() => { window.location.href = "/api/login"; return null; }}</Route>
        </>
      )}
      
      {/* Legacy auth page - redirect to API login */}
      <Route path="/auth">{() => { window.location.href = "/api/login"; return null; }}</Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
