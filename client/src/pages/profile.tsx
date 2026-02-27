import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLocale } from "@/hooks/use-locale";

export default function ProfilePage() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // `/settings` is the canonical account/profile page (real data + validations).
    setLocation("/settings", { replace: true });
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>
  );
}
