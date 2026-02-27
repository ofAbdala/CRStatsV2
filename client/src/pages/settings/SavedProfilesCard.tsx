/**
 * SavedProfilesCard -- Manage saved player profiles (favorites).
 *
 * Extracted from AccountTab to keep files under 400 lines (Story 1.10, TD-023, AC3).
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Hash,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";
import type { ClashPlayerData, FavoritePlayer } from "./types";

export function SavedProfilesCard({ isPro }: { isPro: boolean }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.favorites.list() as Promise<FavoritePlayer[]>,
  });

  const [newProfileTag, setNewProfileTag] = useState("");
  const [newProfilePreview, setNewProfilePreview] = useState<ClashPlayerData | null>(null);
  const [newProfileSetAsDefault, setNewProfileSetAsDefault] = useState(false);

  const validateNewProfileMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag) as Promise<ClashPlayerData>;
    },
    onSuccess: (data) => {
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

  const favorites = favoritesQuery.data || [];

  return (
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
            {favorites.map((fav) => (
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
              {" \u2022 "}
              {typeof newProfilePreview.trophies === "number"
                ? `${newProfilePreview.trophies} ${t("pages.dashboard.stats.trophies")}`
                : ""}
              {newProfilePreview.clan?.name ? ` \u2022 ${newProfilePreview.clan.name}` : ""}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
