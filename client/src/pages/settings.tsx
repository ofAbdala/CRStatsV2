import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogOut, Moon, Bell, Monitor, Loader2, Check, Hash, Search, Sun, Laptop, Crown, Receipt, Clock, AlertCircle } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface SubscriptionData {
  plan: 'free' | 'pro';
  status: 'inactive' | 'active' | 'canceled' | 'past_due';
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt?: string;
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { t, locale, setLocale, supportedLocales, localeNames } = useLocale();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [clashTag, setClashTag] = useState("");
  const [isSearchingTag, setIsSearchingTag] = useState(false);
  const [tagValidated, setTagValidated] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionData>,
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const subscriptionStatus = subscription?.status || 'inactive';
  const isCanceled = subscriptionStatus === 'canceled';
  const isPastDue = subscriptionStatus === 'past_due';
  const currentPeriodEnd = subscription?.currentPeriodEnd;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;
  const subscriptionCreatedAt = subscription?.createdAt;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await api.stripe.createPortal();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: t('billing.toast.portalError'),
        description: error.message || t('billing.toast.tryAgain'),
        variant: "destructive",
      });
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName((profile as any).displayName || "");
      setClashTag((profile as any).clashTag?.replace("#", "") || "");
      if ((profile as any).clashTag) {
        setTagValidated(true);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      const serverTheme = (settings as any).theme;
      if (serverTheme && serverTheme !== theme) {
        setTheme(serverTheme);
      }
    }
  }, [settings]);

  const validateTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag);
    },
    onSuccess: (data: any) => {
      setTagValidated(true);
      setDisplayName(data.name);
      toast({
        title: t("common.success"),
        description: t("settings.profile.clashTagHint"),
      });
    },
    onError: (error: Error) => {
      setTagValidated(false);
      toast({
        title: t("errors.invalidTag"),
        description: error.message || t("errors.playerNotFound"),
        variant: "destructive",
      });
    },
  });

  const handleValidateTag = () => {
    if (!clashTag.trim()) {
      toast({
        title: t("errors.invalidTag"),
        description: t("settings.profile.clashTagHint"),
        variant: "destructive",
      });
      return;
    }
    setIsSearchingTag(true);
    validateTagMutation.mutate(clashTag, {
      onSettled: () => setIsSearchingTag(false),
    });
  };

  const handleSaveProfile = () => {
    const rawTag = clashTag.trim().toUpperCase();
    const normalizedTag = rawTag ? `#${rawTag.replace(/^#/, '')}` : null;
    
    updateProfile.mutate({
      displayName: displayName || undefined,
      clashTag: normalizedTag,
    });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    
    queryClient.setQueryData(['settings'], (old: any) => ({
      ...old,
      theme: newTheme,
    }));
    
    updateSettings.mutate({ theme: newTheme }, {
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      },
    });
  };

  const handleNotificationsChange = (enabled: boolean) => {
    queryClient.setQueryData(['settings'], (old: any) => ({
      ...old,
      notificationsEnabled: enabled,
    }));
    
    updateSettings.mutate({ notificationsEnabled: enabled }, {
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      },
    });
  };

  const handleAdvancedStatsChange = (enabled: boolean) => {
    queryClient.setQueryData(['settings'], (old: any) => ({
      ...old,
      showAdvancedStats: enabled,
    }));
    
    updateSettings.mutate({ showAdvancedStats: enabled }, {
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      },
    });
  };

  const handleLanguageChange = (lang: string) => {
    setLocale(lang as any);
    
    queryClient.setQueryData(['settings'], (old: any) => ({
      ...old,
      preferredLanguage: lang,
    }));
    
    updateSettings.mutate({ preferredLanguage: lang }, {
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      },
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const notificationsEnabled = (settings as any)?.notificationsEnabled ?? true;
  const showAdvancedStats = (settings as any)?.showAdvancedStats ?? false;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground">{t("settings.preferences.title")}</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="account" data-testid="tab-account">{t("settings.profile.title")}</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">{t("nav.billing")}</TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">{t("settings.preferences.title")}</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("settings.profile.title")}</CardTitle>
                <CardDescription>{t("settings.profile.clashTagHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <Avatar className="w-20 h-20 border-2 border-border">
                        <AvatarImage src={(user as any)?.profileImageUrl} />
                        <AvatarFallback>
                          {displayName?.substring(0, 2).toUpperCase() || "CR"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{(user as any)?.email || t("errors.generic")}</p>
                        <p className="text-sm text-muted-foreground">Replit</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 max-w-md">
                      <div className="grid gap-2">
                        <Label htmlFor="display-name">{t("settings.profile.displayName")}</Label>
                        <Input 
                          id="display-name" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder={t("settings.profile.displayName")}
                          data-testid="input-display-name"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="clash-tag">{t("settings.profile.clashTag")}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="clash-tag" 
                              value={clashTag}
                              onChange={(e) => {
                                setClashTag(e.target.value.toUpperCase().replace("#", ""));
                                setTagValidated(false);
                              }}
                              placeholder="2P090J0"
                              className="pl-9 font-mono uppercase"
                              data-testid="input-clash-tag"
                            />
                          </div>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleValidateTag}
                            disabled={isSearchingTag || !clashTag.trim()}
                            data-testid="button-validate-tag"
                          >
                            {isSearchingTag ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : tagValidated ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tagValidated 
                            ? t("common.success")
                            : t("settings.profile.clashTagHint")}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending || profileLoading}
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t("common.save")}
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">{t("common.delete")}</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{t("nav.logout")}</h4>
                  <p className="text-sm text-muted-foreground">{t("nav.logout")}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.logout")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6 space-y-6">
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {isPastDue && (
                  <Alert variant="destructive" data-testid="alert-past-due">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('billing.paymentPastDue')}
                    </AlertDescription>
                  </Alert>
                )}

                {cancelAtPeriodEnd && currentPeriodEnd && subscription?.plan === 'pro' && (
                  <Alert className="border-yellow-500/50" data-testid="alert-cancel-pending">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                      {t('billing.cancelPending', { date: formatDate(currentPeriodEnd) })}
                    </AlertDescription>
                  </Alert>
                )}

                <Card className={cn(
                  "border-primary/50 bg-gradient-to-br from-card to-primary/5",
                  isPro && "ring-2 ring-primary"
                )}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span>{t("billing.currentPlan")}:</span>
                        <Badge 
                          variant={isPro ? "default" : "secondary"} 
                          className={cn(isPro && "bg-gradient-to-r from-yellow-500 to-orange-500")}
                          data-testid="badge-current-plan"
                        >
                          {isPro ? (
                            <>
                              <Crown className="w-3 h-3 mr-1" />
                              PRO
                            </>
                          ) : (
                            "FREE"
                          )}
                        </Badge>
                        {subscription?.plan === 'pro' && subscriptionStatus !== 'active' && (
                          <Badge variant={isPastDue ? "destructive" : "secondary"} data-testid="badge-subscription-status">
                            {isPastDue ? t('billing.status.pastDue') : isCanceled ? t('billing.status.canceled') : t('billing.status.inactive')}
                          </Badge>
                        )}
                      </div>
                      {isPro ? (
                        <Button 
                          size="sm" 
                          className="font-bold" 
                          onClick={handleManageSubscription}
                          disabled={loadingPortal}
                          data-testid="button-manage-subscription"
                        >
                          {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          {t("billing.manageSubscription")}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" 
                          onClick={() => setLocation("/billing")} 
                          data-testid="button-upgrade"
                        >
                          <Crown className="w-4 h-4 mr-1" />
                          {t("billing.pro.name")}
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isPro ? t("billing.pro.description") : t("billing.free.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {isPro && currentPeriodEnd && !cancelAtPeriodEnd && (
                        <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-muted-foreground">{t("billing.renewsLabel")}</span>
                          <span className="font-medium" data-testid="text-period-end">{formatDate(currentPeriodEnd)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("billing.status.label")}</span>
                        <span className="font-medium capitalize" data-testid="text-subscription-status">
                          {subscriptionStatus === 'active' ? t('billing.status.active') : 
                           subscriptionStatus === 'canceled' ? t('billing.status.canceled') : 
                           subscriptionStatus === 'past_due' ? t('billing.status.pastDue') : 
                           t('billing.status.inactive')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-border/50 bg-card/50" data-testid="card-payment-history">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      {t("billing.paymentHistory.title")}
                    </CardTitle>
                    <CardDescription>{t("billing.paymentHistory.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isPro || subscription?.plan === 'pro' ? (
                      <div className="space-y-4">
                        {subscriptionCreatedAt && (
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t("billing.toast.activated")}</span>
                            <span className="font-medium" data-testid="text-subscription-created">{formatDate(subscriptionCreatedAt)}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                          <p className="text-sm">{t("billing.paymentHistory.usePortal")}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4"
                            onClick={handleManageSubscription}
                            disabled={loadingPortal}
                            data-testid="button-view-invoices-portal"
                          >
                            {loadingPortal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {t("billing.paymentHistory.viewInPortal")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">{t("common.none")}</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("settings.preferences.theme")}</CardTitle>
                    <CardDescription>{t("settings.preferences.title")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        <span className="font-medium">{t("settings.preferences.theme")}</span>
                      </div>
                      <Select value={theme} onValueChange={handleThemeChange}>
                        <SelectTrigger className="w-[140px]" data-testid="select-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light" data-testid="option-theme-light">
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4" />
                              {t("settings.preferences.themeLight")}
                            </div>
                          </SelectItem>
                          <SelectItem value="dark" data-testid="option-theme-dark">
                            <div className="flex items-center gap-2">
                              <Moon className="w-4 h-4" />
                              {t("settings.preferences.themeDark")}
                            </div>
                          </SelectItem>
                          <SelectItem value="system" data-testid="option-theme-system">
                            <div className="flex items-center gap-2">
                              <Laptop className="w-4 h-4" />
                              {t("settings.preferences.themeSystem")}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("settings.preferences.language")}</CardTitle>
                    <CardDescription>{t("settings.preferences.title")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t("settings.preferences.language")}</span>
                      <Select value={locale} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-[180px]" data-testid="select-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedLocales.map((loc) => (
                            <SelectItem key={loc} value={loc} data-testid={`option-language-${loc}`}>
                              {localeNames[loc]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("settings.preferences.notifications")}</CardTitle>
                    <CardDescription>{t("settings.preferences.title")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="font-medium">{t("settings.preferences.notifications")}</span>
                      </div>
                      <Switch 
                        checked={notificationsEnabled} 
                        onCheckedChange={handleNotificationsChange}
                        data-testid="switch-notifications"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span className="font-medium">{t("dashboard.stats.battleCount")}</span>
                      </div>
                      <Switch 
                        checked={showAdvancedStats}
                        onCheckedChange={handleAdvancedStatsChange}
                        data-testid="switch-advanced-stats"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
