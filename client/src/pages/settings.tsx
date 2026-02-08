import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CreditCard,
  Hash,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Search,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { t, locale, setLocale } = useLocale();

  const [displayName, setDisplayName] = useState("");
  const [clashTag, setClashTag] = useState("");
  const [isSearchingTag, setIsSearchingTag] = useState(false);
  const [tagValidated, setTagValidated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifyTraining, setNotifyTraining] = useState(true);
  const [notifyBilling, setNotifyBilling] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState<"pt" | "en">(locale === "en-US" ? "en" : "pt");

  useEffect(() => {
    if (profile) {
      setDisplayName((profile as any).displayName || "");
      const defaultTag = (profile as any).defaultPlayerTag || (profile as any).clashTag;
      setClashTag(defaultTag?.replace("#", "") || "");
      if (defaultTag) setTagValidated(true);
    }
  }, [profile]);

  useEffect(() => {
    if (!settingsData) return;

    const settings = settingsData as any;
    const notificationPreferences = settings.notificationPreferences || {};
    setDarkMode((settings.theme || "dark") === "dark");
    setNotifySystem(notificationPreferences.system ?? settings.notificationsSystem ?? true);
    setNotifyTraining(notificationPreferences.training ?? settings.notificationsTraining ?? true);
    setNotifyBilling(notificationPreferences.billing ?? settings.notificationsBilling ?? true);
    setPreferredLanguage(settings.preferredLanguage?.startsWith("en") ? "en" : "pt");
  }, [settingsData]);

  const validateTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag);
    },
    onSuccess: (data: any) => {
      setTagValidated(true);
      setDisplayName(data.name);
      toast({
        title: t("settings.toast.tagValidatedTitle"),
        description: t("settings.toast.tagValidatedDescription", { name: data.name }),
      });
    },
    onError: (error: Error) => {
      setTagValidated(false);
      toast({
        title: t("settings.toast.tagInvalidTitle"),
        description: error.message || t("settings.toast.tagInvalidDescription"),
        variant: "destructive",
      });
    },
  });

  const handleValidateTag = () => {
    if (!clashTag.trim()) {
      toast({
        title: t("settings.toast.emptyTagTitle"),
        description: t("settings.toast.emptyTagDescription"),
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
    const normalizedTag = rawTag ? `#${rawTag.replace(/^#/, "")}` : null;

    updateProfile.mutate({
      displayName: displayName || undefined,
      clashTag: normalizedTag,
      defaultPlayerTag: normalizedTag,
    });
  };

  const handleSavePreferences = () => {
    updateSettings.mutate({
      theme: darkMode ? "dark" : "light",
      preferredLanguage,
      notificationsEnabled: notifySystem || notifyTraining || notifyBilling,
      notificationsSystem: notifySystem,
      notificationsTraining: notifyTraining,
      notificationsBilling: notifyBilling,
      notificationPreferences: {
        system: notifySystem,
        training: notifyTraining,
        billing: notifyBilling,
      },
    } as any);

    setLocale(preferredLanguage === "en" ? "en-US" : "pt-BR");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("settings.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("settings.pageSubtitle")}</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[640px]">
            <TabsTrigger value="account">{t("settings.tabs.account")}</TabsTrigger>
            <TabsTrigger value="billing">{t("settings.tabs.billing")}</TabsTrigger>
            <TabsTrigger value="preferences">{t("settings.tabs.preferences")}</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("settings.account.title")}</CardTitle>
                <CardDescription>{t("settings.account.subtitle")}</CardDescription>
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
                        <AvatarFallback>{displayName?.substring(0, 2).toUpperCase() || "CR"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{(user as any)?.email || t("settings.account.emailUnavailable")}</p>
                        <p className="text-sm text-muted-foreground">{t("settings.account.accountProvider")}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 max-w-md">
                      <div className="grid gap-2">
                        <Label htmlFor="display-name">{t("settings.account.displayName")}</Label>
                        <Input
                          id="display-name"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder={t("settings.account.displayNamePlaceholder")}
                          data-testid="input-display-name"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="clash-tag">{t("settings.account.clashTag")}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="clash-tag"
                              value={clashTag}
                              onChange={(event) => {
                                setClashTag(event.target.value.toUpperCase().replace("#", ""));
                                setTagValidated(false);
                              }}
                              placeholder={t("settings.account.clashTagPlaceholder")}
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
                          {tagValidated ? t("settings.account.tagValidatedHint") : t("settings.account.tagValidationHint")}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || profileLoading}>
                  {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("settings.account.save")}
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">{t("settings.account.dangerTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{t("settings.account.logoutTitle")}</h4>
                  <p className="text-sm text-muted-foreground">{t("settings.account.logoutDescription")}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/api/auth/logout";
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.logout")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6 space-y-6">
            <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {t("settings.billing.currentPlan")}
                  <Button size="sm" className="font-bold" onClick={() => setLocation("/billing")}>
                    {t("settings.billing.upgrade")}
                  </Button>
                </CardTitle>
                <CardDescription>{t("settings.billing.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">{t("settings.billing.cycleLabel")}</span>
                    <span className="font-medium">{t("settings.billing.monthly")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">{t("settings.billing.nextRenewal")}</span>
                    <span className="font-medium">-</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{t("settings.billing.invoiceHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">{t("settings.billing.emptyInvoices")}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{t("settings.preferences.appearanceTitle")}</CardTitle>
                <CardDescription>{t("settings.preferences.appearanceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span className="font-medium">{t("settings.preferences.darkMode")}</span>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={(checked) => setDarkMode(checked)}
                    disabled={settingsLoading || updateSettings.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{t("settings.preferences.languageTitle")}</CardTitle>
                <CardDescription>{t("settings.preferences.languageDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={preferredLanguage === "pt" ? "default" : "outline"}
                    onClick={() => setPreferredLanguage("pt")}
                  >
                    {t("settings.preferences.languagePt")}
                  </Button>
                  <Button
                    type="button"
                    variant={preferredLanguage === "en" ? "default" : "outline"}
                    onClick={() => setPreferredLanguage("en")}
                  >
                    {t("settings.preferences.languageEn")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{t("settings.preferences.notificationsTitle")}</CardTitle>
                <CardDescription>{t("settings.preferences.notificationsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PreferenceToggle
                  icon={<Bell className="w-4 h-4" />}
                  label={t("settings.preferences.systemNotifications")}
                  checked={notifySystem}
                  onCheckedChange={setNotifySystem}
                  disabled={settingsLoading || updateSettings.isPending}
                />
                <PreferenceToggle
                  icon={<Monitor className="w-4 h-4" />}
                  label={t("settings.preferences.trainingNotifications")}
                  checked={notifyTraining}
                  onCheckedChange={setNotifyTraining}
                  disabled={settingsLoading || updateSettings.isPending}
                />
                <PreferenceToggle
                  icon={<CreditCard className="w-4 h-4" />}
                  label={t("settings.preferences.billingNotifications")}
                  checked={notifyBilling}
                  onCheckedChange={setNotifyBilling}
                  disabled={settingsLoading || updateSettings.isPending}
                />
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button onClick={handleSavePreferences} disabled={settingsLoading || updateSettings.isPending}>
                  {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("settings.preferences.save")}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PreferenceToggle({
  icon,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
