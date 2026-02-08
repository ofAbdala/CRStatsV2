import { useMemo } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";
import {
  CheckCircle2,
  Crown,
  Loader2,
  Plus,
  Sparkles,
  Swords,
  Target,
  Zap,
} from "lucide-react";
import { PushAnalysisCard, type PushAnalysisCardData } from "@/components/PushAnalysisCard";

interface TrainingDrill {
  id: string;
  focusArea: string;
  description: string;
  targetGames: number;
  completedGames: number;
  mode: string;
  priority: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
}

interface TrainingPlan {
  id: string;
  title: string;
  source: string;
  status: "active" | "archived" | "completed";
  pushAnalysisId?: string | null;
  drills: TrainingDrill[];
  createdAt: string;
  updatedAt: string;
}

function isPlanActive(plan: TrainingPlan | null | undefined) {
  return Boolean(plan && plan.status === "active");
}

function isDrillDone(drill: TrainingDrill) {
  return drill.status === "completed" || drill.status === "skipped" || drill.completedGames >= drill.targetGames;
}

function getErrorMessage(error: unknown, t: (key: string) => string, fallbackKey: string) {
  if (error instanceof ApiError) return getApiErrorMessage(error, t, fallbackKey);
  if (error instanceof Error) return error.message;
  return t(fallbackKey);
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get() as Promise<{ clashTag?: string }>,
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<{ plan?: string; status?: string }>,
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  const activePlanQuery = useQuery({
    queryKey: ["training-plan"],
    queryFn: () => api.training.getPlan() as Promise<TrainingPlan | null>,
    enabled: isPro,
  });

  const plansQuery = useQuery({
    queryKey: ["training-plans"],
    queryFn: () => api.training.getPlans() as Promise<TrainingPlan[]>,
    enabled: isPro,
  });

  const latestAnalysisQuery = useQuery({
    queryKey: ["latest-push-analysis", "training"],
    queryFn: () => api.coach.getLatestPushAnalysis() as Promise<PushAnalysisCardData | null>,
    enabled: isPro,
  });

  const generateAnalysisMutation = useMutation({
    mutationFn: () => api.coach.generatePushAnalysis(profile?.clashTag),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["latest-push-analysis"] });
      await queryClient.invalidateQueries({ queryKey: ["latest-push-analysis", "training"] });
      toast({
        title: t("pages.training.toast.analysisGeneratedTitle"),
        description: t("pages.training.toast.analysisGeneratedDescription"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.analysisGenerateErrorTitle"),
        description: getErrorMessage(error, t, "pages.training.errors.generateAnalysis"),
        variant: "destructive",
      });
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: (pushAnalysisId?: string) => api.training.generatePlan(pushAnalysisId),
    onSuccess: async (plan: TrainingPlan) => {
      queryClient.setQueryData(["training-plan"], plan);
      await queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      toast({
        title: t("pages.training.toast.planCreatedTitle"),
        description: t("pages.training.toast.planCreatedDescription", { title: plan.title }),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.planCreateErrorTitle"),
        description: getErrorMessage(error, t, "pages.training.errors.generatePlan"),
        variant: "destructive",
      });
    },
  });

  const updateDrillMutation = useMutation({
    mutationFn: ({
      drillId,
      data,
    }: {
      drillId: string;
      data: { completedGames?: number; status?: string };
    }) => api.training.updateDrill(drillId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      await queryClient.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.drillUpdateErrorTitle"),
        description: getErrorMessage(error, t, "pages.training.errors.updateDrill"),
        variant: "destructive",
      });
    },
  });

  const completePlanMutation = useMutation({
    mutationFn: (planId: string) => api.training.updatePlan(planId, { status: "completed" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["training-plan"] });
      await queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      toast({
        title: t("pages.training.toast.planCompletedTitle"),
        description: t("pages.training.toast.planCompletedDescription"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.training.toast.planCompleteErrorTitle"),
        description: getErrorMessage(error, t, "pages.training.errors.completePlan"),
        variant: "destructive",
      });
    },
  });

  const activePlan = activePlanQuery.data;
  const completedPlan = useMemo(() => {
    const plans = plansQuery.data || [];
    return plans.find((plan) => plan.status === "completed") || null;
  }, [plansQuery.data]);

  const sortedDrills = useMemo(() => {
    if (!activePlan?.drills) return [];
    return [...activePlan.drills].sort((a, b) => a.priority - b.priority);
  }, [activePlan?.drills]);

  const planProgress = useMemo(() => {
    if (!sortedDrills.length) return 0;
    const doneCount = sortedDrills.filter((drill) => isDrillDone(drill)).length;
    return Math.round((doneCount / sortedDrills.length) * 100);
  }, [sortedDrills]);

  const allDrillsCompleted = sortedDrills.length > 0 && sortedDrills.every((drill) => isDrillDone(drill));

  const loadingState = subscriptionLoading || (isPro && (activePlanQuery.isLoading || plansQuery.isLoading || latestAnalysisQuery.isLoading));

  const queryError = activePlanQuery.error || plansQuery.error || latestAnalysisQuery.error;

  const handleProgressDrill = (drill: TrainingDrill) => {
    const nextCompletedGames = Math.min(drill.targetGames, drill.completedGames + 1);
    const nextStatus = nextCompletedGames >= drill.targetGames ? "completed" : "in_progress";
    updateDrillMutation.mutate({
      drillId: drill.id,
      data: { completedGames: nextCompletedGames, status: nextStatus },
    });
  };

  const handleCompleteDrill = (drill: TrainingDrill) => {
    updateDrillMutation.mutate({
      drillId: drill.id,
      data: { completedGames: drill.targetGames, status: "completed" },
    });
  };

  const latestAnalysis = latestAnalysisQuery.data || null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{t("pages.training.title")}</h1>
            <p className="text-muted-foreground">{t("pages.training.subtitle")}</p>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? t("pages.training.planPro") : t("pages.training.planFree")}
          </Badge>
        </div>

        {!isPro && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center space-y-3">
              <Crown className="w-8 h-8 text-yellow-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("pages.training.proOnly")}
              </p>
              <Link href="/billing">
                <Button>
                  <Crown className="w-4 h-4 mr-2" />
                  {t("pages.training.upgradeCta")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {loadingState && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("pages.training.loading")}
            </CardContent>
          </Card>
        )}

        {isPro && !loadingState && queryError && (
          <PageErrorState
            title={t("pages.training.errors.loadTitle")}
            description={getErrorMessage(queryError, t, "pages.training.errors.loadData")}
            error={queryError}
            onRetry={() => {
              activePlanQuery.refetch();
              plansQuery.refetch();
              latestAnalysisQuery.refetch();
            }}
          />
        )}

        {isPro && !loadingState && !queryError && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {isPlanActive(activePlan) ? (
                <>
                  <Card className="border-border/50 bg-card/50" data-testid="training-state-active">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          {activePlan?.title || t("pages.training.activePlanTitle")}
                        </CardTitle>
                        <Badge variant="outline">{t("pages.training.status.active")}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t("pages.training.planProgress")}</span>
                          <span>{planProgress}%</span>
                        </div>
                        <Progress value={planProgress} className="h-2" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sortedDrills.map((drill) => {
                        const drillProgress = Math.min(100, Math.round((drill.completedGames / Math.max(1, drill.targetGames)) * 100));
                        const done = isDrillDone(drill);
                        return (
                          <Card key={drill.id} className="border-border/40">
                            <CardContent className="py-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium">{drill.focusArea}</p>
                                  <p className="text-sm text-muted-foreground">{drill.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("pages.training.drillMeta", {
                                      mode: drill.mode,
                                      priority: drill.priority,
                                    })}
                                  </p>
                                </div>
                                <Badge variant="outline" className={cn(done && "text-green-500 border-green-500/40")}>
                                  {done
                                    ? t("pages.training.status.completed")
                                    : drill.status === "in_progress"
                                      ? t("pages.training.status.inProgress")
                                      : t("pages.training.status.pending")}
                                </Badge>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{t("pages.training.drillProgress", { completed: drill.completedGames, target: drill.targetGames })}</span>
                                  <span>{drillProgress}%</span>
                                </div>
                                <Progress value={drillProgress} className="h-2" />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleProgressDrill(drill)}
                                  disabled={done || updateDrillMutation.isPending}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {t("pages.training.incrementDrill")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteDrill(drill)}
                                  disabled={done || updateDrillMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  {t("pages.training.markDrillCompleted")}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      <div className="pt-2">
                        <Button
                          className="w-full"
                          disabled={!allDrillsCompleted || completePlanMutation.isPending}
                          onClick={() => activePlan && completePlanMutation.mutate(activePlan.id)}
                        >
                          {completePlanMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              {t("pages.training.completingPlan")}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {t("pages.training.markPlanCompleted")}
                            </>
                          )}
                        </Button>
                        {!allDrillsCompleted && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("pages.training.finishAllDrillsHint")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : completedPlan ? (
                <Card className="border-border/50 bg-card/50" data-testid="training-state-completed">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        {t("pages.training.completedStateTitle")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t("pages.training.completedStateDescription", { title: completedPlan.title })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                        variant="outline"
                        onClick={() => generateAnalysisMutation.mutate()}
                        disabled={generateAnalysisMutation.isPending}
                      >
                          {generateAnalysisMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              {t("pages.training.generatingAnalysis")}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              {t("pages.training.generateNewAnalysis")}
                            </>
                          )}
                        </Button>
                      <Button
                        onClick={() => generatePlanMutation.mutate(latestAnalysis?.id)}
                        disabled={generatePlanMutation.isPending || !latestAnalysis}
                      >
                          {generatePlanMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              {t("pages.training.generatingPlan")}
                            </>
                          ) : (
                            <>
                              <Swords className="w-4 h-4 mr-2" />
                              {t("pages.training.generateNewPlan")}
                            </>
                          )}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 bg-card/50" data-testid="training-state-empty">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("pages.training.emptyStateTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("pages.training.emptyStateDescription")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => generateAnalysisMutation.mutate()}
                        disabled={generateAnalysisMutation.isPending}
                      >
                        {generateAnalysisMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {t("pages.training.generatingAnalysis")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t("pages.training.generateAnalysis")}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => generatePlanMutation.mutate(latestAnalysis?.id)}
                        disabled={generatePlanMutation.isPending || !latestAnalysis}
                      >
                        {generatePlanMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {t("pages.training.generatingPlan")}
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            {t("pages.training.generatePlan")}
                          </>
                        )}
                      </Button>
                    </div>
                    {!latestAnalysis && (
                      <p className="text-xs text-muted-foreground">
                        {t("pages.training.analysisRequiredHint")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {latestAnalysis ? (
                <PushAnalysisCard analysis={latestAnalysis} />
              ) : (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base">{t("pages.training.pushAnalysisTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {t("pages.training.pushAnalysisDescription")}
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">{t("pages.training.executionTipTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>{t("pages.training.executionTip1")}</p>
                  <p>{t("pages.training.executionTip2")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
