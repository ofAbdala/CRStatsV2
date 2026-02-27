/**
 * PreferencesTab -- Language and notification preferences.
 *
 * Extracted from the original settings.tsx (Story 1.10, TD-023).
 */

import { useEffect, useState, type ReactNode } from "react";
import { Bell, CreditCard, Loader2, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useLocale } from "@/hooks/use-locale";
import type { SettingsUpdatePayload } from "./types";

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

export function PreferencesTab() {
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { t, locale, setLocale } = useLocale();

  const [darkMode, setDarkMode] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifyTraining, setNotifyTraining] = useState(true);
  const [notifyBilling, setNotifyBilling] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState<"pt" | "en">(locale === "en-US" ? "en" : "pt");

  useEffect(() => {
    if (!settingsData) return;

    const notificationPreferences = settingsData.notificationPreferences as
      | { system?: boolean; training?: boolean; billing?: boolean }
      | undefined;
    setDarkMode((settingsData.theme || "dark") === "dark");
    setNotifySystem(notificationPreferences?.system ?? true);
    setNotifyTraining(notificationPreferences?.training ?? true);
    setNotifyBilling(notificationPreferences?.billing ?? true);
    setPreferredLanguage(settingsData.preferredLanguage?.startsWith("en") ? "en" : "pt");
  }, [settingsData]);

  const handleSavePreferences = () => {
    const payload: SettingsUpdatePayload = {
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
    };

    updateSettings.mutate(payload);
    setLocale(preferredLanguage === "en" ? "en-US" : "pt-BR");
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
