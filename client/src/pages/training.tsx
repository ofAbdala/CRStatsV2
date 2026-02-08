import { useMemo } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        title: "Análise gerada",
        description: "A análise mais recente já está disponível para montar o plano.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao gerar análise",
        description: getErrorMessage(error, "Não foi possível gerar a análise de push."),
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
        title: "Plano criado",
        description: `Novo plano ativo: ${plan.title}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao criar plano",
        description: getErrorMessage(error, "Não foi possível gerar o plano de treino."),
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
        title: "Falha ao atualizar drill",
        description: getErrorMessage(error, "Não foi possível atualizar o drill."),
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
        title: "Plano concluído",
        description: "Parabéns! Seu plano foi marcado como concluído.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao concluir plano",
        description: getErrorMessage(error, "Não foi possível concluir o plano."),
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
            <h1 className="text-3xl font-display font-bold">Centro de Treinamento</h1>
            <p className="text-muted-foreground">Fluxo completo: análise de push, plano, drills e conclusão.</p>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? "PRO" : "FREE"}
          </Badge>
        </div>

        {!isPro && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center space-y-3">
              <Crown className="w-8 h-8 text-yellow-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                O Centro de Treinamento completo é exclusivo do plano PRO.
              </p>
              <Link href="/billing">
                <Button>
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer upgrade para PRO
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {loadingState && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando treinamento...
            </CardContent>
          </Card>
        )}

        {isPro && !loadingState && queryError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{getErrorMessage(queryError, "Falha ao carregar dados de treinamento.")}</AlertDescription>
          </Alert>
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
                          {activePlan?.title || "Plano ativo"}
                        </CardTitle>
                        <Badge variant="outline">Ativo</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso do plano</span>
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
                                    Modo: {drill.mode} • Prioridade {drill.priority}
                                  </p>
                                </div>
                                <Badge variant="outline" className={cn(done && "text-green-500 border-green-500/40")}>
                                  {done ? "Concluído" : drill.status === "in_progress" ? "Em progresso" : "Pendente"}
                                </Badge>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{drill.completedGames}/{drill.targetGames} partidas</span>
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
                                  +1 partida
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteDrill(drill)}
                                  disabled={done || updateDrillMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Marcar concluído
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
                              Concluindo plano...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Marcar plano como concluído
                            </>
                          )}
                        </Button>
                        {!allDrillsCompleted && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Conclua todos os drills para finalizar o plano.
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
                      Plano concluído
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Você já concluiu "{completedPlan.title}". Gere uma nova análise de push para iniciar o próximo ciclo.
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
                            Gerando análise...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar nova análise de push
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
                            Gerando plano...
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4 mr-2" />
                            Gerar novo plano
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 bg-card/50" data-testid="training-state-empty">
                  <CardHeader>
                    <CardTitle className="text-lg">Nenhum plano ativo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Para começar, gere uma análise de push e depois monte seu plano de drills personalizado.
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
                            Gerando análise...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar análise de push
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
                            Gerando plano...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Gerar plano de treino
                          </>
                        )}
                      </Button>
                    </div>
                    {!latestAnalysis && (
                      <p className="text-xs text-muted-foreground">
                        Você precisa de uma análise de push para gerar o plano.
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
                    <CardTitle className="text-base">Análise de push</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Gere uma análise para alimentar seu próximo plano de treino.
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-base">Dica de execução</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Execute os drills em blocos curtos de 3 a 5 partidas para reduzir variância.</p>
                  <p>Se detectar tilt alto na análise, pause após 2 derrotas seguidas.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
