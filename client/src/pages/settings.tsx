import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CreditCard,
  ExternalLink,
  Hash,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";

function formatDate(value: string | null | undefined, locale: "pt-BR" | "en-US") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatMoneyFromCents(amountInCents: number, currency: string, locale: "pt-BR" | "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((amountInCents || 0) / 100);
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { t, locale, setLocale } = useLocale();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<any>,
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => api.billing.getInvoices() as Promise<any[]>,
  });

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.favorites.list() as Promise<any[]>,
  });

  const [displayName, setDisplayName] = useState("");
  const [clashTag, setClashTag] = useState("");
  const [isSearchingTag, setIsSearchingTag] = useState(false);
  const [tagValidated, setTagValidated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifyTraining, setNotifyTraining] = useState(true);
  const [notifyBilling, setNotifyBilling] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState<"pt" | "en">(locale === "en-US" ? "en" : "pt");

  const [newProfileTag, setNewProfileTag] = useState("");
  const [newProfilePreview, setNewProfilePreview] = useState<any | null>(null);
  const [newProfileSetAsDefault, setNewProfileSetAsDefault] = useState(false);

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

  const validateNewProfileMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag);
    },
    onSuccess: (data: any) => {
      setNewProfilePreview(data);
      toast({
        title: t("settings.toast.tagValidatedTitle"),
        description: t("settings.toast.tagValidatedDescription", { name: data.name }),
      });
    },
    onError: (error: Error) => {
      setNewProfilePreview(null);
      toast({
        title: t("settings.toast.tagInvalidTitle"),
        description: error.message || t("settings.toast.tagInvalidDescription"),
        variant: "destructive",
      });
    },
  });

  const saveNewProfileMutation = useMutation({
    mutationFn: async () => {
      const rawTag = newProfileTag.trim().toUpperCase();
      const normalizedTag = rawTag ? `#${rawTag.replace(/^#/, "")}` : null;

      if (!normalizedTag || !newProfilePreview) {
        throw new Error("Missing player tag");
      }

      const payload = {
        playerTag: normalizedTag,
        name: newProfilePreview.name,
        trophies: newProfilePreview.trophies,
        clan: newProfilePreview.clan?.name,
        setAsDefault: newProfileSetAsDefault,
      };

      return api.favorites.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      if (newProfileSetAsDefault) {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
      setNewProfileTag("");
      setNewProfilePreview(null);
      setNewProfileSetAsDefault(false);
      toast({
        title: t("common.success"),
        description: t("settings.account.savedProfilesSaved"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("common.error"),
        description: getApiErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });

  const deleteFavoriteMutation = useMutation({
    mutationFn: (id: string) => api.favorites.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("common.error"),
        description: getApiErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });

  const setDefaultProfileMutation = useMutation({
    mutationFn: (tag: string) => api.profile.update({ defaultPlayerTag: tag, clashTag: tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["player-sync"] });
      queryClient.invalidateQueries({ queryKey: ["history-battles"] });
      toast({
        title: t("common.success"),
        description: t("settings.account.savedProfilesDefaultUpdated"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("common.error"),
        description: getApiErrorMessage(error, t),
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

  const subscription = subscriptionQuery.data as any;
  const invoices = (invoicesQuery.data as any[]) || [];
  const favorites = (favoritesQuery.data as any[]) || [];
  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  const inferredCycle = (() => {
    const first = invoices[0];
    if (!first?.periodStart || !first?.periodEnd) return null;
    const start = new Date(first.periodStart);
    const end = new Date(first.periodEnd);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(diffDays) || diffDays <= 0) return null;
    return diffDays > 200 ? "yearly" : "monthly";
  })();

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

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("settings.account.savedProfilesTitle")}</CardTitle>
                <CardDescription>{t("settings.account.savedProfilesSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {favoritesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : favorites.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("settings.account.savedProfilesEmpty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favorites.map((fav: any) => (
                      <div
                        key={fav.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{fav.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{fav.playerTag}</div>
                          {fav.clan ? (
                            <div className="text-xs text-muted-foreground truncate">{fav.clan}</div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDefaultProfileMutation.mutate(fav.playerTag)}
                            disabled={setDefaultProfileMutation.isPending}
                          >
                            {t("settings.account.savedProfilesUse")}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => deleteFavoriteMutation.mutate(fav.id)}
                            disabled={deleteFavoriteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-border/50 bg-background/30 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-medium">{t("settings.account.savedProfilesAddTitle")}</h4>
                    {!isPro ? <Badge variant="outline">FREE</Badge> : <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">PRO</Badge>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-profile-tag">{t("settings.account.savedProfilesTagLabel")}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-profile-tag"
                          value={newProfileTag}
                          onChange={(event) => {
                            setNewProfileTag(event.target.value.toUpperCase().replace("#", ""));
                            setNewProfilePreview(null);
                          }}
                          placeholder={t("settings.account.savedProfilesTagPlaceholder")}
                          className="pl-9 font-mono uppercase"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => validateNewProfileMutation.mutate(newProfileTag)}
                        disabled={validateNewProfileMutation.isPending || !newProfileTag.trim()}
                      >
                        {validateNewProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => saveNewProfileMutation.mutate()}
                        disabled={saveNewProfileMutation.isPending || !newProfilePreview}
                      >
                        {saveNewProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {t("settings.account.savedProfilesSave")}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newProfileSetAsDefault}
                        onCheckedChange={(checked) => setNewProfileSetAsDefault(checked)}
                        disabled={saveNewProfileMutation.isPending}
                      />
                      <span className="text-sm">{t("settings.account.savedProfilesSetDefault")}</span>
                    </div>
                    {!isPro ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/billing")}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t("settings.billing.upgrade")}
                      </Button>
                    ) : null}
                  </div>

                  {newProfilePreview ? (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{newProfilePreview.name}</span>
                      {" • "}
                      {typeof newProfilePreview.trophies === "number"
                        ? `${newProfilePreview.trophies} ${t("pages.dashboard.stats.trophies")}`
                        : ""}
                      {newProfilePreview.clan?.name ? ` • ${newProfilePreview.clan.name}` : ""}
                    </div>
                  ) : null}
                </div>
              </CardContent>
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
                    getSupabaseClient()
                      .auth.signOut()
                      .catch(() => undefined)
                      .finally(() => {
                        window.location.href = "/";
                      });
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
	                    <span className="text-muted-foreground">{t("settings.billing.planLabel")}</span>
	                    <span className="font-medium uppercase">{subscription?.plan || "-"}</span>
	                  </div>
	                  <div className="flex justify-between py-2 border-b border-border/50">
	                    <span className="text-muted-foreground">{t("settings.billing.statusLabel")}</span>
	                    <span className="font-medium">{subscription?.status || "-"}</span>
	                  </div>
	                  <div className="flex justify-between py-2 border-b border-border/50">
	                    <span className="text-muted-foreground">{t("settings.billing.cycleLabel")}</span>
	                    <span className="font-medium">
	                      {inferredCycle === "yearly"
	                        ? t("billing.yearly")
	                        : inferredCycle === "monthly"
	                          ? t("billing.monthly")
	                          : "-"}
	                    </span>
	                  </div>
	                  <div className="flex justify-between py-2 border-b border-border/50">
	                    <span className="text-muted-foreground">{t("settings.billing.nextRenewal")}</span>
	                    <span className="font-medium">{formatDate(subscription?.currentPeriodEnd, locale)}</span>
	                  </div>
	                </div>
	              </CardContent>
	            </Card>

	            <Card className="border-border/50 bg-card/50">
	              <CardHeader>
	                <CardTitle>{t("settings.billing.invoiceHistory")}</CardTitle>
	              </CardHeader>
	              <CardContent>
	                {invoicesQuery.isLoading ? (
	                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
	                    <Loader2 className="w-4 h-4 animate-spin" />
	                    {t("common.loading")}
	                  </div>
	                ) : invoices.length === 0 ? (
	                  <p className="text-sm text-muted-foreground text-center py-8">{t("settings.billing.emptyInvoices")}</p>
	                ) : (
	                  <Table>
	                    <TableHeader>
	                      <TableRow>
	                        <TableHead>{t("pages.billing.invoices.table.date")}</TableHead>
	                        <TableHead>{t("pages.billing.invoices.table.status")}</TableHead>
	                        <TableHead>{t("pages.billing.invoices.table.amount")}</TableHead>
	                        <TableHead className="text-right">{t("pages.billing.invoices.table.actions")}</TableHead>
	                      </TableRow>
	                    </TableHeader>
	                    <TableBody>
	                      {invoices.slice(0, 5).map((invoice: any) => (
	                        <TableRow key={invoice.id}>
	                          <TableCell>{formatDate(invoice.createdAt, locale)}</TableCell>
	                          <TableCell>
	                            <Badge variant="outline">{invoice.status || "-"}</Badge>
	                          </TableCell>
	                          <TableCell>
	                            {formatMoneyFromCents(
	                              invoice.amountPaid || invoice.amountDue || 0,
	                              invoice.currency || "BRL",
	                              locale,
	                            )}
	                          </TableCell>
	                          <TableCell className="text-right">
	                            {invoice.hostedInvoiceUrl ? (
	                              <a
	                                href={invoice.hostedInvoiceUrl}
	                                target="_blank"
	                                rel="noreferrer"
	                                className="inline-flex items-center text-sm text-primary hover:underline"
	                              >
	                                {t("pages.billing.invoices.open")}
	                                <ExternalLink className="w-3 h-3 ml-1" />
	                              </a>
	                            ) : (
	                              <span className="text-xs text-muted-foreground">-</span>
	                            )}
	                          </TableCell>
	                        </TableRow>
	                      ))}
	                    </TableBody>
	                  </Table>
	                )}
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
