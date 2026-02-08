import { type ComponentType } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LocaleProvider, useLocale } from "@/hooks/use-locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NotFoundPage from "@/pages/not-found";
import LandingPage from "@/pages/landing";
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
import NotificationsPage from "@/pages/notifications";

function withLocalBoundary(component: ComponentType, contextKey: string) {
  return function ComponentWithBoundary() {
    const PageComponent = component;
    return (
      <ErrorBoundary contextKey={contextKey}>
        <PageComponent />
      </ErrorBoundary>
    );
  };
}

const DashboardWithBoundary = withLocalBoundary(DashboardPage, "dashboard");
const MeWithBoundary = withLocalBoundary(MePage, "me");
const CoachWithBoundary = withLocalBoundary(CoachPage, "coach");
const TrainingWithBoundary = withLocalBoundary(TrainingPage, "training");
const BillingWithBoundary = withLocalBoundary(BillingPage, "billing");
const NotificationsWithBoundary = withLocalBoundary(NotificationsPage, "notifications");

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
      <Route path="/" component={isAuthenticated ? DashboardWithBoundary : LandingPage} />
      <Route path="/p/:tag" component={PublicProfilePage} />

      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={DashboardWithBoundary} />
          <Route path="/coach" component={CoachWithBoundary} />
          <Route path="/training" component={TrainingWithBoundary} />
          <Route path="/decks" component={DecksPage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/billing" component={BillingWithBoundary} />
          <Route path="/me" component={MeWithBoundary} />
          <Route path="/notifications" component={NotificationsWithBoundary} />
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
          <Route path="/notifications">{() => { window.location.href = "/api/login"; return null; }}</Route>
        </>
      )}

      <Route path="/auth">{() => { window.location.href = "/api/login"; return null; }}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary contextKey="global">
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <SpeedInsights />
          </TooltipProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
