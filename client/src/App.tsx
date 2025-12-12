import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={isAuthenticated ? DashboardPage : LandingPage} />
      <Route path="/p/:tag" component={PublicProfilePage} />
      
      {/* Protected routes - redirect to login if not authenticated */}
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/coach" component={CoachPage} />
          <Route path="/training" component={TrainingPage} />
          <Route path="/decks" component={DecksPage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/onboarding" component={OnboardingPage} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
