import { lazy, Suspense, type ComponentType } from "react";
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

// ── Lazy-loaded pages ───────────────────────────────────────────────────────
// Route-based code splitting: each page is loaded on demand (TD-024).
// Recharts (~400KB) is only loaded when user visits chart-heavy pages (me, decks).

const LandingPage = lazy(() => import("@/pages/landing"));
const AuthPage = lazy(() => import("@/pages/auth"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const CoachPage = lazy(() => import("@/pages/coach"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const TrainingPage = lazy(() => import("@/pages/training"));
const DecksPage = lazy(() => import("@/pages/decks"));
const CommunityPage = lazy(() => import("@/pages/community"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const PublicProfilePage = lazy(() => import("@/pages/public-profile"));
const BillingPage = lazy(() => import("@/pages/billing"));
const MePage = lazy(() => import("@/pages/me"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const GoalsPage = lazy(() => import("@/pages/goals"));
const PushPage = lazy(() => import("@/pages/push"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const ClanPage = lazy(() => import("@/pages/clan"));
const DeckPage = lazy(() => import("@/pages/deck"));

// ── Suspense loading fallback ───────────────────────────────────────────────
// Shown while lazy-loaded chunks are being fetched (AC6).

function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ── Error boundary wrappers ─────────────────────────────────────────────────
// Every route now has ErrorBoundary protection (TD-055, AC8-AC10).

function withLocalBoundary(LazyComponent: ComponentType, contextKey: string) {
  return function ComponentWithBoundary() {
    return (
      <ErrorBoundary contextKey={contextKey}>
        <LazyComponent />
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
const PricingWithBoundary = withLocalBoundary(PricingPage, "pricing");
const DecksWithBoundary = withLocalBoundary(DecksPage, "decks");
const CommunityWithBoundary = withLocalBoundary(CommunityPage, "community");
const SettingsWithBoundary = withLocalBoundary(SettingsPage, "settings");
const OnboardingWithBoundary = withLocalBoundary(OnboardingPage, "onboarding");
const ProfileWithBoundary = withLocalBoundary(ProfilePage, "profile");
const ClanWithBoundary = withLocalBoundary(ClanPage, "clan");
const DeckWithBoundary = withLocalBoundary(DeckPage, "deck");

// ── Private route wrappers ──────────────────────────────────────────────────
// Each private page is defined exactly once (TD-021).  The `PrivateRoute`
// wrapper handles auth checking and redirects unauthenticated users to `/auth`.

function PrivateDashboard() { return <PrivateRoute><DashboardWithBoundary /></PrivateRoute>; }
function PrivatePush() { return <PrivateRoute><PushWithBoundary /></PrivateRoute>; }
function PrivateCoach() { return <PrivateRoute><CoachWithBoundary /></PrivateRoute>; }
function PrivateTraining() { return <PrivateRoute><TrainingWithBoundary /></PrivateRoute>; }
function PrivateDecks() { return <PrivateRoute><DecksWithBoundary /></PrivateRoute>; }
function PrivateCommunity() { return <PrivateRoute><CommunityWithBoundary /></PrivateRoute>; }
function PrivateGoals() { return <PrivateRoute><GoalsWithBoundary /></PrivateRoute>; }
function PrivateSettings() { return <PrivateRoute><SettingsWithBoundary /></PrivateRoute>; }
function PrivateProfile() { return <PrivateRoute><ProfileWithBoundary /></PrivateRoute>; }
function PrivateOnboarding() { return <PrivateRoute><OnboardingWithBoundary /></PrivateRoute>; }
function PrivateBilling() { return <PrivateRoute><BillingWithBoundary /></PrivateRoute>; }
function PrivateMe() { return <PrivateRoute><MeWithBoundary /></PrivateRoute>; }
function PrivateNotifications() { return <PrivateRoute><NotificationsWithBoundary /></PrivateRoute>; }
function PrivatePricing() { return <PrivateRoute><PricingWithBoundary /></PrivateRoute>; }

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
    <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={HomePage} />
        <Route path="/p/:tag" component={PublicProfilePage} />
        <Route path="/clan/:tag" component={ClanWithBoundary} />
        <Route path="/deck/:encoded" component={DeckWithBoundary} />
        <Route path="/auth" component={AuthPage} />

        {/* Private routes -- each defined exactly once */}
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
        <Route path="/pricing" component={PrivatePricing} />

        {/* Fallback */}
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
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
