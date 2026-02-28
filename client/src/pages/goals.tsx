import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateGoal, useDeleteGoal, useGoals } from "@/hooks/useGoals";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

type GoalType = "trophies" | "winrate" | "streak" | "custom";
type GoalFrequency = "daily" | "weekly" | "monthly";

function encodeFrequency(freq?: GoalFrequency | null) {
  if (!freq) return undefined;
  return `freq:${freq}`;
}

function decodeFrequency(description?: string | null): GoalFrequency | null {
  if (!description) return null;
  const match = description.match(/(?:^|\\s)freq:(daily|weekly|monthly)(?:$|\\s)/);
  if (!match) return null;
  return match[1] as GoalFrequency;
}

const typeBadgeKeys: Record<GoalType, string> = {
  trophies: "pages.goals.badgeTrophies",
  winrate: "pages.goals.badgeWinrate",
  streak: "pages.goals.badgeStreak",
  custom: "pages.goals.badgeCustom",
};

const frequencyKeys: Record<GoalFrequency, string> = {
  daily: "pages.goals.freqDaily",
  weekly: "pages.goals.freqWeekly",
  monthly: "pages.goals.freqMonthly",
};

const autoTitleKeys: Record<Exclude<GoalType, "custom">, string> = {
  trophies: "pages.goals.autoTitleTrophies",
  winrate: "pages.goals.autoTitleWinrate",
  streak: "pages.goals.autoTitleStreak",
};

export default function GoalsPage() {
  const { t } = useLocale();

  const goalsQuery = useGoals();
  const createGoalMutation = useCreateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [type, setType] = useState<GoalType>("trophies");
  const [targetValue, setTargetValue] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [frequency, setFrequency] = useState<GoalFrequency | "">("");

  const goals = goalsQuery.data || [];

  const activeGoals = useMemo(() => goals.filter((goal) => !goal.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((goal) => goal.completed), [goals]);

  const resetCreateForm = () => {
    setType("trophies");
    setTargetValue("");
    setCustomTitle("");
    setFrequency("");
  };

  const canSubmit = useMemo(() => {
    const target = Number(targetValue);
    if (!Number.isFinite(target) || target < 1) return false;
    if (type === "winrate" && target > 100) return false;
    if (type === "custom" && customTitle.trim().length === 0) return false;
    return true;
  }, [customTitle, targetValue, type]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const target = Number(targetValue);
    if (!Number.isFinite(target)) return;

    const truncatedTarget = Math.trunc(target);
    const title = type === "custom"
      ? customTitle.trim()
      : t(autoTitleKeys[type], { target: truncatedTarget });
    const description = type === "custom"
      ? encodeFrequency(frequency ? (frequency as GoalFrequency) : null)
      : undefined;

    const payload = {
      type,
      targetValue: truncatedTarget,
      title,
      ...(description ? { description } : {}),
    };

    createGoalMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        resetCreateForm();
      },
    });
  };

  const handleDelete = (goal: { id: string }) => {
    const confirmed = window.confirm(t("pages.goals.deleteConfirm"));
    if (!confirmed) return;
    deleteGoalMutation.mutate(goal.id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              {t("pages.dashboard.goalsTitle")}
            </h1>
            <p className="text-muted-foreground">
              {t("pages.goals.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("pages.goals.newGoal")}
            </Button>

            <Link href="/dashboard">
              <Button variant="outline">{t("common.back")}</Button>
            </Link>
          </div>
        </div>

        {goalsQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.loading")}
            </CardContent>
          </Card>
        ) : goalsQuery.isError ? (
          <PageErrorState
            title={t("pages.goals.errorTitle")}
            description={t("pages.goals.errorDescription")}
            error={goalsQuery.error}
            onRetry={() => goalsQuery.refetch()}
          />
        ) : goals.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p className="font-medium">{t("pages.goals.emptyTitle")}</p>
              <p className="text-sm">
                {t("pages.goals.emptyHint")}
              </p>
              <div className="mt-4">
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("pages.goals.newGoal")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {t("pages.goals.activeGoals")}{" "}
                  <span className="text-muted-foreground font-normal">({activeGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("pages.dashboard.emptyGoals")}
                  </p>
                ) : (
                  activeGoals.map((goal) => {
                    const currentValue = goal.currentValue || 0;
                    const target = goal.targetValue || 0;
                    const progress = target > 0 ? Math.min(100, Math.round((currentValue / target) * 100)) : 0;
                    const goalType = (goal.type || "custom") as GoalType;
                    const freq = decodeFrequency(goal.description);

                    return (
                      <div
                        key={goal.id}
                        className="border border-border/50 rounded-lg p-4 bg-background/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{goal.title}</p>
                              <Badge variant="outline" className="text-[10px]">
                                {t(typeBadgeKeys[goalType])}
                              </Badge>
                              {freq ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {t(frequencyKeys[freq])}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {t("pages.goals.progress")}: {currentValue} / {target}
                                </span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2 mt-2" />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("shrink-0", deleteGoalMutation.isPending && "opacity-50")}
                            onClick={() => handleDelete(goal)}
                            disabled={deleteGoalMutation.isPending}
                            aria-label={t("pages.goals.deleteGoal")}
                            title={t("pages.goals.deleteButton")}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {t("pages.goals.completedGoals")}{" "}
                  <span className="text-muted-foreground font-normal">({completedGoals.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("pages.goals.noCompletedGoals")}
                  </p>
                ) : (
                  completedGoals.map((goal) => {
                    const goalType = (goal.type || "custom") as GoalType;
                    const freq = decodeFrequency(goal.description);
                    return (
                      <div
                        key={goal.id}
                        className="border border-border/50 rounded-lg p-4 bg-background/20 opacity-80"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{goal.title}</p>
                              <Badge className="text-[10px] bg-green-500/15 text-green-500 border border-green-500/30">
                                {t("pages.goals.completedBadge")}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {t(typeBadgeKeys[goalType])}
                              </Badge>
                              {freq ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {t(frequencyKeys[freq])}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("pages.goals.target")}: {goal.targetValue}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("shrink-0", deleteGoalMutation.isPending && "opacity-50")}
                            onClick={() => handleDelete(goal)}
                            disabled={deleteGoalMutation.isPending}
                            aria-label={t("pages.goals.deleteGoal")}
                            title={t("pages.goals.deleteButton")}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t("pages.goals.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("pages.goals.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("pages.goals.typeLabel")}</Label>
              <Select value={type} onValueChange={(value) => setType(value as GoalType)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pages.goals.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trophies">{t("pages.goals.typeTrophies")}</SelectItem>
                  <SelectItem value="winrate">{t("pages.goals.typeWinrate")}</SelectItem>
                  <SelectItem value="streak">{t("pages.goals.typeStreak")}</SelectItem>
                  <SelectItem value="custom">{t("pages.goals.typeCustom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="customTitle">{t("pages.goals.customTitleLabel")}</Label>
                <Input
                  id="customTitle"
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder={t("pages.goals.customTitlePlaceholder")}
                  maxLength={200}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="targetValue">{t("pages.goals.targetLabel")}</Label>
              <Input
                id="targetValue"
                type="number"
                inputMode="numeric"
                min={1}
                max={type === "winrate" ? 100 : undefined}
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                placeholder={type === "winrate" ? "60" : type === "trophies" ? "6500" : "5"}
                required
              />
              {type === "winrate" ? (
                <p className="text-xs text-muted-foreground">{t("pages.goals.winrateHint")}</p>
              ) : null}
            </div>

            {type === "custom" ? (
              <div className="space-y-2">
                <Label>{t("pages.goals.frequencyLabel")}</Label>
                <Select value={frequency || undefined} onValueChange={(value) => setFrequency(value as GoalFrequency)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pages.goals.frequencyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("pages.goals.freqDaily")}</SelectItem>
                    <SelectItem value="weekly">{t("pages.goals.freqWeekly")}</SelectItem>
                    <SelectItem value="monthly">{t("pages.goals.freqMonthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createGoalMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!canSubmit || createGoalMutation.isPending}>
                {createGoalMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("pages.goals.saving")}
                  </>
                ) : (
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
