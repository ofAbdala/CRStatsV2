import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/hooks/use-locale";
import { api } from "@/lib/api";
import { CheckCircle2, Crown, Lock, Shield, Target, Zap } from "lucide-react";

export default function TrainingPage() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<{ plan?: string; status?: string }>,
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("pages.training.title")}</h1>
            <p className="text-muted-foreground">{t("pages.training.subtitle")}</p>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>{isPro ? t("pages.training.planPro") : t("pages.training.planFree")}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DrillCard
            title={t("pages.training.teaser.defenseTitle")}
            description={t("pages.training.teaser.defenseDescription")}
            difficulty="medium"
            progress={60}
            icon={<Shield className="w-5 h-5 text-blue-400" />}
            onClick={() => setLocation("/coach")}
          />
          <DrillCard
            title={t("pages.training.teaser.spellsTitle")}
            description={t("pages.training.teaser.spellsDescription")}
            difficulty="hard"
            progress={30}
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
            onClick={() => setLocation("/coach")}
          />
          <DrillCard
            title={t("pages.training.teaser.elixirTitle")}
            description={t("pages.training.teaser.elixirDescription")}
            difficulty="easy"
            progress={90}
            icon={<Target className="w-5 h-5 text-green-400" />}
            onClick={() => setLocation("/coach")}
          />
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            {t("pages.training.advancedTitle")} <Badge variant="secondary" className="text-xs">PRO</Badge>
          </h2>

          {isPro ? (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  {t("pages.training.advancedUnlockedTitle")}
                </CardTitle>
                <CardDescription>{t("pages.training.advancedUnlockedDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setLocation("/coach")}>{t("pages.training.advancedUnlockedCta")}</Button>
              </CardContent>
            </Card>
          ) : (
            <Card
              className="border-border/50 bg-card/30 border-dashed relative overflow-hidden group cursor-pointer"
              onClick={() => setLocation("/billing")}
            >
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all group-hover:bg-background/50">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{t("pages.training.advancedLockedTitle")}</h3>
                <p className="text-muted-foreground max-w-md mb-6">{t("pages.training.advancedLockedDescription")}</p>
                <Button className="font-bold interactive-hover shadow-lg shadow-primary/20">
                  {t("pages.training.upgradeCta")}
                </Button>
              </div>

              <CardContent className="p-6 opacity-50 blur-sm pointer-events-none">
                <div className="space-y-4">
                  <div className="h-24 bg-muted rounded-lg w-full" />
                  <div className="h-24 bg-muted rounded-lg w-full" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DrillCard({
  title,
  description,
  difficulty,
  progress,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  progress: number;
  icon: ReactNode;
  onClick: () => void;
}) {
  const { t } = useLocale();

  const difficultyLabel = t(`pages.training.teaser.difficulty.${difficulty}`);
  const difficultyClass =
    difficulty === "easy"
      ? "text-green-400 border-green-400/30"
      : difficulty === "medium"
        ? "text-yellow-400 border-yellow-400/30"
        : "text-red-400 border-red-400/30";

  return (
    <Card
      className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer interactive-hover"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 rounded-lg bg-background border border-border">{icon}</div>
          <Badge variant="outline" className={difficultyClass}>
            {difficultyLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        <CardDescription className="line-clamp-2 mt-1.5">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("pages.training.teaser.progressLabel")}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full interactive-hover" variant={progress === 100 ? "outline" : "default"}>
          {progress === 100 ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("pages.training.teaser.done")}
            </>
          ) : (
            t("pages.training.teaser.start")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
