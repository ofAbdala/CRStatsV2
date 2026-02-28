import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/hooks/use-locale";
import { api, type TrainingPlanResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { CheckCircle2, Crown, Loader2, Lock, Shield, Target, Zap } from "lucide-react";

export default function TrainingPage() {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  const trainingPlanQuery = useQuery({
    queryKey: ["training-plan"],
    queryFn: () => api.training.getPlan(),
    enabled: isPro,
    retry: false,
  });

  const trainingPlansQuery = useQuery({
    queryKey: ["training-plans"],
    queryFn: () => api.training.getPlans(),
    enabled: isPro,
    retry: false,
  });

  const latestPushAnalysisQuery = useQuery({
    queryKey: ["push-analysis-latest"],
    queryFn: () => api.coach.getLatestPushAnalysis(),
    enabled: isPro,
    retry: false,
  });

  const generateAnalysisMutation = useMutation({
    mutationFn: () => api.coach.generatePushAnalysis(),
    onSuccess: () => {
      toast({
        title: t("pages.training.toast.analysisGeneratedTitle"),
        description: t("pages.training.toast.analysisGeneratedDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["push-analysis-latest"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.analysisGenerateErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.training.errors.generateAnalysis"),
        variant: "destructive",
      });
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: () => api.training.generatePlan(),
    onSuccess: (plan: TrainingPlanResponse) => {
      toast({
        title: t("pages.training.toast.planCreatedTitle"),
        description: t("pages.training.toast.planCreatedDescription", { title: plan?.title || "" }),
      });
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.planCreateErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.training.errors.generatePlan"),
        variant: "destructive",
      });
    },
  });

  const updateDrillMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: { completedGames?: number; status?: string } }) =>
      api.training.updateDrill(drillId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.drillUpdateErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.training.errors.updateDrill"),
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, status }: { planId: string; status: string }) =>
      api.training.updatePlan(planId, { status }),
    onSuccess: () => {
      toast({
        title: t("pages.training.toast.planCompletedTitle"),
        description: t("pages.training.toast.planCompletedDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.planCompleteErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.training.errors.completePlan"),
        variant: "destructive",
      });
    },
  });

  const activePlan = trainingPlanQuery.data ?? null;
  const allPlans = trainingPlansQuery.data || [];
  const latestPlan = allPlans[0] || null;
  const latestCompletedPlan = latestPlan && latestPlan.status === "completed" ? latestPlan : null;

  const hasPushAnalysis = Boolean(latestPushAnalysisQuery.data?.id);

  const planDrills = activePlan?.drills || [];
  const totalTargetGames = planDrills.reduce(
    (acc, drill) => acc + (typeof drill?.targetGames === "number" ? Math.max(0, drill.targetGames) : 0),
    0,
  );
  const totalCompletedGames = planDrills.reduce((acc, drill) => {
    const target = typeof drill?.targetGames === "number" ? Math.max(0, drill.targetGames) : 0;
    const completed = typeof drill?.completedGames === "number" ? Math.max(0, drill.completedGames) : 0;
    return acc + Math.min(target, completed);
  }, 0);
  const planPercent = totalTargetGames > 0 ? Math.round((totalCompletedGames / totalTargetGames) * 100) : 0;
  const allDrillsCompleted =
    planDrills.length > 0 &&
    planDrills.every((drill) => {
      const target = typeof drill?.targetGames === "number" ? drill.targetGames : 0;
      const completed = typeof drill?.completedGames === "number" ? drill.completedGames : 0;
      return drill?.status === "completed" || (target > 0 && completed >= target);
    });

  const isProLoading =
    isPro && (trainingPlanQuery.isLoading || trainingPlansQuery.isLoading || latestPushAnalysisQuery.isLoading);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{t("pages.training.title")}</h1>
            <p className="text-muted-foreground">{t("pages.training.subtitle")}</p>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>{isPro ? t("pages.training.planPro") : t("pages.training.planFree")}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DrillCard
            title={t("pages.training.teaser.defenseTitle")}
            description={t("pages.training.teaser.defenseDescription")}
            difficulty="medium"
            icon={<Shield className="w-5 h-5 text-blue-400" />}
            onClick={() => setLocation("/coach")}
          />
          <DrillCard
            title={t("pages.training.teaser.spellsTitle")}
            description={t("pages.training.teaser.spellsDescription")}
            difficulty="hard"
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
            onClick={() => setLocation("/coach")}
          />
          <DrillCard
            title={t("pages.training.teaser.elixirTitle")}
            description={t("pages.training.teaser.elixirDescription")}
            difficulty="easy"
            icon={<Target className="w-5 h-5 text-green-400" />}
            onClick={() => setLocation("/coach")}
          />
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            {t("pages.training.advancedTitle")} <Badge variant="secondary" className="text-xs">PRO</Badge>
          </h2>

          {isPro ? (
            <div className="space-y-6" aria-busy={isProLoading}>
              {isProLoading ? (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground" role="status" aria-label={t("pages.training.loading")}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("pages.training.loading")}
                  </CardContent>
                </Card>
              ) : !activePlan && latestCompletedPlan ? (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("pages.training.completedStateTitle")}</CardTitle>
                    <CardDescription>
                      {t("pages.training.completedStateDescription", { title: latestCompletedPlan?.title || "" })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <Button
                      onClick={() => generateAnalysisMutation.mutate()}
                      disabled={generateAnalysisMutation.isPending}
                      variant="outline"
                    >
                      {generateAnalysisMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t("pages.training.generatingAnalysis")}
                        </>
                      ) : (
                        t("pages.training.generateNewAnalysis")
                      )}
                    </Button>

                    <Button
                      onClick={() => generatePlanMutation.mutate()}
                      disabled={generatePlanMutation.isPending || !hasPushAnalysis}
                    >
                      {generatePlanMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t("pages.training.generatingPlan")}
                        </>
                      ) : (
                        t("pages.training.generateNewPlan")
                      )}
                    </Button>
                    {!hasPushAnalysis ? (
                      <p className="text-xs text-muted-foreground">{t("pages.training.analysisRequiredHint")}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : !activePlan ? (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("pages.training.emptyStateTitle")}</CardTitle>
                    <CardDescription>{t("pages.training.emptyStateDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Card className="border-border/50 bg-background/30">
                      <CardHeader>
                        <CardTitle className="text-base">{t("pages.training.pushAnalysisTitle")}</CardTitle>
                        <CardDescription>{t("pages.training.pushAnalysisDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => generateAnalysisMutation.mutate()}
                          disabled={generateAnalysisMutation.isPending}
                          className="w-full"
                        >
                          {generateAnalysisMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              {t("pages.training.generatingAnalysis")}
                            </>
                          ) : (
                            t("pages.training.generateAnalysis")
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-background/30">
                      <CardHeader>
                        <CardTitle className="text-base">{t("pages.training.generatePlan")}</CardTitle>
                        <CardDescription>{t("pages.training.analysisRequiredHint")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => generatePlanMutation.mutate()}
                          disabled={generatePlanMutation.isPending || !hasPushAnalysis}
                          className="w-full"
                        >
                          {generatePlanMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              {t("pages.training.generatingPlan")}
                            </>
                          ) : (
                            t("pages.training.generatePlan")
                          )}
                        </Button>
                        {!hasPushAnalysis ? (
                          <p className="text-xs text-muted-foreground mt-2">{t("pages.training.analysisRequiredHint")}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span>{t("pages.training.activePlanTitle")}</span>
                        <Badge variant="outline" className="border-green-500/30 text-green-500">
                          {t("pages.training.status.active")}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{activePlan?.title || ""}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t("pages.training.planProgress")}</span>
                          <span>{planPercent}%</span>
                        </div>
                        <Progress value={planPercent} className="h-2" />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {planDrills.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("pages.training.errors.loadData")}</p>
                        ) : (
                          planDrills
                            .slice()
                            .sort((a, b) => (b?.priority || 0) - (a?.priority || 0))
                            .map((drill) => {
                              const target = typeof drill?.targetGames === "number" ? Math.max(0, drill.targetGames) : 0;
                              const completed =
                                typeof drill?.completedGames === "number" ? Math.max(0, drill.completedGames) : 0;
                              const percent = target > 0 ? Math.round((Math.min(target, completed) / target) * 100) : 0;
                              const isCompleted = drill?.status === "completed" || (target > 0 && completed >= target);
                              const disableActions = updateDrillMutation.isPending || isCompleted;

                              const nextCompleted = Math.min(target, completed + 1);
                              const nextStatus =
                                nextCompleted >= target ? "completed" : nextCompleted > 0 ? "in_progress" : "pending";

                              return (
                                <Card key={drill.id} className="border-border/50 bg-background/30">
                                  <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between gap-2">
                                      <span>{drill.focusArea}</span>
                                      <Badge variant="outline" className={isCompleted ? "border-green-500/30 text-green-500" : ""}>
                                        {isCompleted
                                          ? t("pages.training.status.completed")
                                          : drill?.status === "in_progress"
                                            ? t("pages.training.status.inProgress")
                                            : t("pages.training.status.pending")}
                                      </Badge>
                                    </CardTitle>
                                    <CardDescription>{drill.description}</CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="text-xs text-muted-foreground">
                                      {t("pages.training.drillMeta", { mode: drill.mode, priority: drill.priority || 1 })}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{t("pages.training.drillProgress", { completed, target })}</span>
                                      <span>{percent}%</span>
                                    </div>
                                    <Progress value={percent} className="h-2" />
                                  </CardContent>
                                  <CardFooter className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="flex-1"
                                      disabled={disableActions || target <= 0}
                                      onClick={() =>
                                        updateDrillMutation.mutate({
                                          drillId: drill.id,
                                          data: { completedGames: nextCompleted, status: nextStatus },
                                        })
                                      }
                                    >
                                      {t("pages.training.incrementDrill")}
                                    </Button>
                                    <Button
                                      type="button"
                                      className="flex-1"
                                      disabled={disableActions || target <= 0}
                                      onClick={() =>
                                        updateDrillMutation.mutate({
                                          drillId: drill.id,
                                          data: { completedGames: target, status: "completed" },
                                        })
                                      }
                                    >
                                      {t("pages.training.markDrillCompleted")}
                                    </Button>
                                  </CardFooter>
                                </Card>
                              );
                            })
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30">
                        {allDrillsCompleted ? (
                          <Button
                            onClick={() => updatePlanMutation.mutate({ planId: activePlan.id, status: "completed" })}
                            disabled={updatePlanMutation.isPending}
                            className="w-full"
                          >
                            {updatePlanMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {t("pages.training.completingPlan")}
                              </>
                            ) : (
                              t("pages.training.markPlanCompleted")
                            )}
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center">
                            {t("pages.training.finishAllDrillsHint")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        {t("pages.training.advancedUnlockedTitle")}
                      </CardTitle>
                      <CardDescription>{t("pages.training.advancedUnlockedDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <Button onClick={() => setLocation("/coach")}>{t("pages.training.advancedUnlockedCta")}</Button>
                      <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                        <p className="font-medium mb-2">{t("pages.training.executionTipTitle")}</p>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          <li>{t("pages.training.executionTip1")}</li>
                          <li>{t("pages.training.executionTip2")}</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card
              className="border-border/50 bg-card/30 border-dashed relative overflow-hidden group cursor-pointer focus-within:ring-2 focus-within:ring-ring"
              role="button"
              tabIndex={0}
              onClick={() => setLocation("/billing")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLocation("/billing");
                }
              }}
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
  progress?: number;
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
      className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer interactive-hover focus-within:ring-2 focus-within:ring-ring"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
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
        {typeof progress === "number" ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("pages.training.teaser.progressLabel")}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button className="w-full interactive-hover" variant={typeof progress === "number" && progress === 100 ? "outline" : "default"}>
          {typeof progress === "number" && progress === 100 ? (
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
