/**
 * SettingsPage -- Thin shell/orchestrator for the Settings feature.
 *
 * Manages top-level tab state and renders the appropriate tab component.
 * All feature logic lives in the individual tab modules.
 *
 * Extracted from the original settings.tsx god-file (Story 1.10, TD-023).
 */

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/hooks/use-locale";
import { AccountTab } from "./AccountTab";
import { BillingTab } from "./BillingTab";
import { PreferencesTab } from "./PreferencesTab";

export default function SettingsPage() {
  const { t } = useLocale();

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

          <TabsContent value="account" className="mt-6">
            <AccountTab />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <BillingTab />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <PreferencesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
