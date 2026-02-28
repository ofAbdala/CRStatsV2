import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, AlertCircle, Crown, LineChart, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, api } from "@/lib/api";
import { PushAnalysisCard, PushAnalysisCardData } from "@/components/PushAnalysisCard";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { QuickActions } from "@/components/coach/QuickActions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function getQuickPrompts(t: (key: string) => string) {
  return [
    t("pages.coach.quickPrompts.lastLoss"),
    t("pages.coach.quickPrompts.reduceTilt"),
    t("pages.coach.quickPrompts.deckAdjust"),
  ];
}

export default function CoachPage() {
  const { t, locale } = useLocale();
  const quickPrompts = getQuickPrompts(t);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("pages.coach.welcome"),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [retryContent, setRetryContent] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [hasHydratedHistory, setHasHydratedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get() as Promise<{ defaultPlayerTag?: string; clashTag?: string }>,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const sub = subscription as { plan?: string; status?: string } | undefined;
  const isPro = sub?.plan === "pro" && sub?.status === "active";

  const coachMessagesQuery = useQuery({
    queryKey: ["coach-messages"],
    queryFn: () => api.coach.getMessages(50),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (hasHydratedHistory) return;
    if (!coachMessagesQuery.data) return;
    if (messages.length > 1 || messages[0]?.id !== "welcome") {
      setHasHydratedHistory(true);
      return;
    }

    const history = coachMessagesQuery.data;
    if (Array.isArray(history) && history.length > 0) {
      setMessages(
        history.map((message) => ({
          id: message.id,
          role: message.role === "system" ? "assistant" : message.role,
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
        })),
      );
    }

    setHasHydratedHistory(true);
  }, [coachMessagesQuery.data, hasHydratedHistory, messages]);

  const latestAnalysisQuery = useQuery({
    queryKey: ["latest-push-analysis"],
    queryFn: () => api.coach.getLatestPushAnalysis(),
    refetchOnWindowFocus: false,
    enabled: isPro,
  });

  const pushAnalysisMutation = useMutation({
    mutationFn: () => api.coach.generatePushAnalysis(profile?.defaultPlayerTag || profile?.clashTag),
    onSuccess: () => {
      latestAnalysisQuery.refetch();
      setErrorText(null);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setErrorText(getApiErrorMessage(error, t));
      } else {
        setErrorText(t("pages.coach.pushAnalysisError"));
      }
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (content: string) => {
      const history = messages
        .filter((message) => message.id !== "welcome")
        .map((message) => ({ role: message.role, content: message.content }));
      history.push({ role: "user", content });
      return api.coach.chat(
        history,
        profile?.defaultPlayerTag || profile?.clashTag,
        quickPrompts.includes(content) ? "quick_prompt" : "manual",
      );
    },
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.message,
        timestamp: response.timestamp,
      };
      setMessages((previous) => [...previous, assistantMessage]);
      setRemainingMessages(
        typeof response.remainingMessages === "number" ? response.remainingMessages : null,
      );
      setErrorText(null);
      setRetryContent(null);
      setLimitReached(false);
    },
    onError: (error: unknown, content: string) => {
      if (error instanceof ApiError && error.code === "FREE_COACH_DAILY_LIMIT_REACHED") {
        setLimitReached(true);
        setErrorText(null);
        const details = error.details as { limit?: number; used?: number } | undefined;
        if (typeof details?.limit === "number" && typeof details?.used === "number") {
          setRemainingMessages(Math.max(0, details.limit - details.used));
        }
        setRetryContent(null);
        return;
      }

      if (error instanceof ApiError && error.code === "COACH_CHAT_FAILED") {
        setErrorText(t("pages.coach.providerTemporaryError"));
      } else {
        setErrorText(getApiErrorMessage(error, t));
      }
      setRetryContent(content);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatMutation.isPending]);

  const latestAnalysis = useMemo(() => {
    return (latestAnalysisQuery.data || null) as PushAnalysisCardData | null;
  }, [latestAnalysisQuery.data]);

  const submitMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || chatMutation.isPending || limitReached) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    submitMessage(input);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              {t("coach.title")}
            </h1>
            <p className="text-muted-foreground">{t("pages.coach.subtitle")}</p>
          </div>
          <Badge variant={isPro ? "default" : "secondary"} className={cn(isPro && "bg-gradient-to-r from-yellow-500 to-orange-500")}>
            {isPro ? t("pages.coach.planPro") : t("pages.coach.planFree")}
          </Badge>
        </div>

        {!isPro && (
          <Alert className="border-primary/40">
            <Crown className="h-4 w-4 text-primary" />
            <AlertDescription>
              {t("pages.coach.freeLimitDescription")}
              {remainingMessages !== null ? ` ${t("pages.coach.remainingToday", { count: remainingMessages })}` : ""}
              {" "}
              <Link href="/billing" className="underline">
                {t("pages.coach.upgradeCta")}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {limitReached && (
          <Alert variant="destructive" data-testid="coach-limit-banner">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("pages.coach.limitReached")}{" "}
              <Link href="/billing" className="underline">
                {t("pages.coach.upgradeUnlimited")}
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        {errorText && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{errorText}</p>
              {retryContent && !chatMutation.isPending && !limitReached ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => submitMessage(retryContent)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t("errorBoundary.retry")}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border/50 bg-card/50 overflow-hidden" aria-busy={chatMutation.isPending}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("pages.coach.chatTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-[40vh] md:h-[55vh] pr-3">
                <div className="space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{message.role === "assistant" ? "AI" : t("pages.coach.youShort")}</AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "rounded-xl px-3 py-2 max-w-[80%] text-sm",
                          message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex gap-3" role="status" aria-label={t("coach.thinking")}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="rounded-xl px-3 py-2 bg-muted text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("coach.thinking")}
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t("pages.coach.inputPlaceholder")}
                  disabled={chatMutation.isPending || limitReached}
                />
                <Button type="submit" size="icon" className="min-h-[44px] min-w-[44px]" disabled={chatMutation.isPending || limitReached || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              <QuickActions
                onAction={submitMessage}
                disabled={chatMutation.isPending || limitReached}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  {t("pages.coach.pushAnalysisTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPro ? (
                  <Button
                    onClick={() => pushAnalysisMutation.mutate()}
                    disabled={pushAnalysisMutation.isPending}
                    className="w-full"
                  >
                    {pushAnalysisMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {t("pages.coach.generating")}
                      </>
                    ) : (
                      t("pages.coach.generateAnalysis")
                    )}
                  </Button>
                ) : (
                  <Link href="/billing">
                    <Button className="w-full" variant="outline">
                      <Crown className="w-4 h-4 mr-2" />
                      {t("pages.coach.upgradeCta")}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {!isPro ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-6 text-sm text-muted-foreground">
                  {t("apiErrors.codes.proRequired")}{" "}
                  <Link href="/billing" className="underline">
                    {t("pages.coach.upgradeCta")}
                  </Link>
                  .
                </CardContent>
              </Card>
            ) : latestAnalysisQuery.isLoading ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("pages.coach.loadingLatestAnalysis")}
                </CardContent>
              </Card>
            ) : latestAnalysisQuery.isError ? (
              <PageErrorState
                title={t("pages.coach.latestAnalysisErrorTitle")}
                description={getApiErrorMessage(latestAnalysisQuery.error, t, "pages.coach.latestAnalysisErrorDescription")}
                error={latestAnalysisQuery.error}
                onRetry={() => latestAnalysisQuery.refetch()}
              />
            ) : latestAnalysis ? (
              <PushAnalysisCard analysis={latestAnalysis} />
            ) : (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-6 text-sm text-muted-foreground">
                  {t("pages.coach.noSavedAnalysis")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
