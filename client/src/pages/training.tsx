import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Brain, 
  Swords, 
  CheckCircle2, 
  Lock, 
  Loader2, 
  Plus,
  Zap,
  Clock,
  ChevronRight,
  AlertTriangle,
  Trophy,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

interface TrainingDrill {
  id: string;
  planId: string;
  focusArea: string;
  description: string;
  targetGames: number;
  completedGames: number;
  mode: string | null;
  priority: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  source: string;
  status: string;
  pushAnalysisId: string | null;
  createdAt: string;
  updatedAt: string;
  drills: TrainingDrill[];
}

export default function TrainingPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription'],
    queryFn: () => api.subscription.get(),
  });

  const sub = subscription as { plan?: string; status?: string } | undefined;
  const isPro = sub?.plan === 'pro' && sub?.status === 'active';

  const { data: activePlan, isLoading: planLoading } = useQuery({
    queryKey: ['/api/training/plan'],
    queryFn: () => api.training.getActivePlan(),
  });

  const generatePlanMutation = useMutation({
    mutationFn: () => api.training.generateFromPush(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/plan'] });
      setGeneratingPlan(false);
    },
    onError: () => {
      setGeneratingPlan(false);
    },
  });

  const updateDrillMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: { completedGames?: number; status?: string } }) =>
      api.training.updateDrill(drillId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/plan'] });
    },
  });

  const handleGeneratePlan = () => {
    setGeneratingPlan(true);
    generatePlanMutation.mutate();
  };

  const handleCompleteDrill = (drill: TrainingDrill) => {
    updateDrillMutation.mutate({
      drillId: drill.id,
      data: {
        completedGames: drill.targetGames,
        status: 'completed',
      },
    });
  };

  const handleIncrementProgress = (drill: TrainingDrill) => {
    const newCompletedGames = Math.min(drill.completedGames + 1, drill.targetGames);
    const newStatus = newCompletedGames >= drill.targetGames ? 'completed' : 'in_progress';
    
    updateDrillMutation.mutate({
      drillId: drill.id,
      data: {
        completedGames: newCompletedGames,
        status: newStatus,
      },
    });
  };

  const getFocusIcon = (focusArea: string) => {
    switch (focusArea) {
      case 'tilt': return <Brain className="w-5 h-5 text-red-400" />;
      case 'macro': return <Clock className="w-5 h-5 text-blue-400" />;
      case 'deck': return <Swords className="w-5 h-5 text-purple-400" />;
      case 'matchup': return <Target className="w-5 h-5 text-orange-400" />;
      case 'fundamentals': return <Zap className="w-5 h-5 text-green-400" />;
      default: return <Target className="w-5 h-5 text-primary" />;
    }
  };

  const getFocusLabel = (focusArea: string) => {
    const labels: Record<string, string> = {
      tilt: t('training.focusAreas.tilt'),
      macro: t('training.focusAreas.macro'),
      deck: t('training.focusAreas.deck'),
      matchup: t('training.focusAreas.matchup'),
      fundamentals: t('training.focusAreas.fundamentals'),
    };
    return labels[focusArea] || focusArea;
  };

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    
    const config: Record<number, { label: string; className: string }> = {
      1: { label: t('training.priority.high'), className: 'bg-red-500/10 text-red-500 border-red-500/20' },
      2: { label: t('training.priority.medium'), className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      3: { label: t('training.priority.low'), className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    };
    
    const conf = config[priority] || config[2];
    return <Badge variant="outline" className={conf.className}>{conf.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: t('training.pending'), className: 'bg-muted text-muted-foreground' },
      in_progress: { label: t('training.inProgress'), className: 'bg-blue-500/10 text-blue-500' },
      completed: { label: t('training.completed'), className: 'bg-green-500/10 text-green-500' },
    };
    
    const conf = config[status] || config.pending;
    return <Badge className={conf.className}>{conf.label}</Badge>;
  };

  const completedDrills = activePlan?.drills?.filter(d => d.status === 'completed').length || 0;
  const totalDrills = activePlan?.drills?.length || 0;
  const planProgress = totalDrills > 0 ? Math.round((completedDrills / totalDrills) * 100) : 0;

  if (!isPro) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t('training.title')}</h1>
            <p className="text-muted-foreground">{t('training.subtitle')}</p>
          </div>

          <Card className="border-border/50 bg-card/30 border-dashed relative overflow-hidden" data-testid="training-pro-locked">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
            <CardContent className="p-8 text-center relative">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('training.proRequired')}</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {t('training.proDesc')}
              </p>
              <Link href="/billing">
                <Button 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  data-testid="button-upgrade-training"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('coachLimits.upgradeCta')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-50 pointer-events-none">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 rounded-lg bg-background border border-border">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">--</Badge>
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span>0%</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t('training.title')}</h1>
            <p className="text-muted-foreground">{t('training.subtitle')}</p>
          </div>
          
          {!activePlan && (
            <Button
              onClick={handleGeneratePlan}
              disabled={generatingPlan || generatePlanMutation.isPending}
              className="bg-gradient-to-r from-primary to-primary/80"
              data-testid="button-generate-plan"
            >
              {generatingPlan || generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('training.generatingPlan')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('training.generateFromPush')}
                </>
              )}
            </Button>
          )}
        </div>

        {generatePlanMutation.isError && (
          <Card className="border-destructive/50 bg-destructive/5" data-testid="training-error">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{t('training.needPushAnalysis')}</p>
            </CardContent>
          </Card>
        )}

        {planLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activePlan ? (
          <div className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent" data-testid="active-plan-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">{t('training.activePlan')}</Badge>
                    <CardTitle className="text-xl">{activePlan.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Trophy className="w-4 h-4" />
                      {t('training.progress').replace('{completed}', String(completedDrills)).replace('{total}', String(totalDrills))}
                    </CardDescription>
                  </div>
                  {planProgress === 100 && (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-medium">{t('training.allCompleted')}</span>
                    </div>
                  )}
                </div>
                <Progress value={planProgress} className="h-2 mt-4" />
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePlan.drills?.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  getFocusIcon={getFocusIcon}
                  getFocusLabel={getFocusLabel}
                  getPriorityBadge={getPriorityBadge}
                  getStatusBadge={getStatusBadge}
                  onComplete={() => handleCompleteDrill(drill)}
                  onIncrement={() => handleIncrementProgress(drill)}
                  isUpdating={updateDrillMutation.isPending}
                  t={t}
                />
              ))}
            </div>

            {planProgress === 100 && (
              <div className="text-center pt-4">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan || generatePlanMutation.isPending}
                  variant="outline"
                  data-testid="button-new-plan"
                >
                  {generatingPlan || generatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('training.generatingPlan')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('training.generatePlan')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="no-plan-card">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('training.noPlan')}</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {t('training.noPlanDesc')}
              </p>
              <Button
                onClick={handleGeneratePlan}
                disabled={generatingPlan || generatePlanMutation.isPending}
                data-testid="button-generate-plan-empty"
              >
                {generatingPlan || generatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('training.generatingPlan')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('training.generateFromPush')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

interface DrillCardProps {
  drill: TrainingDrill;
  getFocusIcon: (area: string) => React.ReactNode;
  getFocusLabel: (area: string) => string;
  getPriorityBadge: (priority: number | null) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  onComplete: () => void;
  onIncrement: () => void;
  isUpdating: boolean;
  t: (key: string) => string;
}

function DrillCard({ 
  drill, 
  getFocusIcon, 
  getFocusLabel, 
  getPriorityBadge, 
  getStatusBadge,
  onComplete,
  onIncrement,
  isUpdating,
  t 
}: DrillCardProps) {
  const progress = Math.round((drill.completedGames / drill.targetGames) * 100);
  const isCompleted = drill.status === 'completed';

  return (
    <Card 
      className={cn(
        "border-border/50 bg-card/50 backdrop-blur-sm transition-all",
        isCompleted && "opacity-70",
        !isCompleted && "hover:border-primary/50 hover:-translate-y-1"
      )}
      data-testid={`drill-card-${drill.id}`}
    >
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 rounded-lg bg-background border border-border">
            {getFocusIcon(drill.focusArea)}
          </div>
          <div className="flex items-center gap-2">
            {getPriorityBadge(drill.priority)}
            {getStatusBadge(drill.status)}
          </div>
        </div>
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            {getFocusLabel(drill.focusArea)}
          </Badge>
          <CardDescription className="line-clamp-3 text-sm mt-2">
            {drill.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('training.gamesProgress').replace('{completed}', String(drill.completedGames)).replace('{total}', String(drill.targetGames))}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {isCompleted ? (
          <Button className="w-full" variant="outline" disabled>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {t('training.completed')}
          </Button>
        ) : (
          <>
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={onIncrement}
              disabled={isUpdating}
              data-testid={`button-increment-${drill.id}`}
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              +1
            </Button>
            <Button 
              className="flex-1"
              onClick={onComplete}
              disabled={isUpdating}
              data-testid={`button-complete-${drill.id}`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('training.markComplete')}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
