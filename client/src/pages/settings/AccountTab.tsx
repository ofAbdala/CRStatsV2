/**
 * AccountTab -- Account settings and saved player profiles.
 *
 * Extracted from the original settings.tsx (Story 1.10, TD-023).
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  Hash,
  Loader2,
  LogOut,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { SavedProfilesCard } from "./SavedProfilesCard";
import type { ClashPlayerData, SubscriptionData } from "./types";

export function AccountTab() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { t } = useLocale();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionData>,
  });

  const [displayName, setDisplayName] = useState("");
  const [clashTag, setClashTag] = useState("");
  const [isSearchingTag, setIsSearchingTag] = useState(false);
  const [tagValidated, setTagValidated] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      const defaultTag = profile.defaultPlayerTag || profile.clashTag;
      setClashTag(defaultTag?.replace("#", "") || "");
      if (defaultTag) setTagValidated(true);
    }
  }, [profile]);

  const validateTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag) as Promise<ClashPlayerData>;
    },
    onSuccess: (data) => {
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

  const subscription = subscriptionQuery.data;
  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <div className="space-y-6">
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
                  <AvatarImage src={user?.profileImageUrl ?? undefined} />
                  <AvatarFallback>{displayName?.substring(0, 2).toUpperCase() || "CR"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.email || t("settings.account.emailUnavailable")}</p>
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

      <SavedProfilesCard isPro={isPro} />

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
    </div>
  );
}
