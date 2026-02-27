import { type ComponentType } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/use-locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NotFoundPage from "@/pages/not-found";
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
import NotificationsPage from "@/pages/notifications";
import GoalsPage from "@/pages/goals";
import PushPage from "@/pages/push";

// ── Error boundary wrappers ─────────────────────────────────────────────────

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
const GoalsWithBoundary = withLocalBoundary(GoalsPage, "goals");
const PushWithBoundary = withLocalBoundary(PushPage, "push");

// ── Private route wrappers ──────────────────────────────────────────────────
// Each private page is defined exactly once (TD-021).  The `PrivateRoute`
// wrapper handles auth checking and redirects unauthenticated users to `/auth`.

function PrivateDashboard() { return <PrivateRoute><DashboardWithBoundary /></PrivateRoute>; }
function PrivatePush() { return <PrivateRoute><PushWithBoundary /></PrivateRoute>; }
function PrivateCoach() { return <PrivateRoute><CoachWithBoundary /></PrivateRoute>; }
function PrivateTraining() { return <PrivateRoute><TrainingWithBoundary /></PrivateRoute>; }
function PrivateDecks() { return <PrivateRoute><DecksPage /></PrivateRoute>; }
function PrivateCommunity() { return <PrivateRoute><CommunityPage /></PrivateRoute>; }
function PrivateGoals() { return <PrivateRoute><GoalsWithBoundary /></PrivateRoute>; }
function PrivateSettings() { return <PrivateRoute><SettingsPage /></PrivateRoute>; }
function PrivateProfile() { return <PrivateRoute><ProfilePage /></PrivateRoute>; }
function PrivateOnboarding() { return <PrivateRoute><OnboardingPage /></PrivateRoute>; }
function PrivateBilling() { return <PrivateRoute><BillingWithBoundary /></PrivateRoute>; }
function PrivateMe() { return <PrivateRoute><MeWithBoundary /></PrivateRoute>; }
function PrivateNotifications() { return <PrivateRoute><NotificationsWithBoundary /></PrivateRoute>; }

// ── Home route ──────────────────────────────────────────────────────────────
// The root route shows the dashboard for authenticated users or the landing
// page for visitors.  This is the only route that varies by auth state at
// the route definition level.

function HomePage() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DashboardWithBoundary /> : <LandingPage />;
}

// ── Router ──────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/p/:tag" component={PublicProfilePage} />
      <Route path="/auth" component={AuthPage} />

      {/* Private routes — each defined exactly once */}
      <Route path="/dashboard" component={PrivateDashboard} />
      <Route path="/push" component={PrivatePush} />
      <Route path="/coach" component={PrivateCoach} />
      <Route path="/training" component={PrivateTraining} />
      <Route path="/decks" component={PrivateDecks} />
      <Route path="/community" component={PrivateCommunity} />
      <Route path="/goals" component={PrivateGoals} />
      <Route path="/settings" component={PrivateSettings} />
      <Route path="/profile" component={PrivateProfile} />
      <Route path="/onboarding" component={PrivateOnboarding} />
      <Route path="/billing" component={PrivateBilling} />
      <Route path="/me" component={PrivateMe} />
      <Route path="/notifications" component={PrivateNotifications} />

      {/* Fallback */}
      <Route component={NotFoundPage} />
    </Switch>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

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
