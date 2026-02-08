import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, AlertCircle, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/hooks/use-locale";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function CoachPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPro, setRequiresPro] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get() as Promise<{ clashTag?: string }>,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const isPro = (subscription as any)?.plan === "pro" && (subscription as any)?.status === "active";

  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: t('coach.welcome'),
      timestamp: new Date().toISOString(),
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);
    setRequiresPro(false);

    try {
      const chatMessages = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: "user", content: input });

      const response = await api.coach.chat(chatMessages, profile?.clashTag);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (err.message?.includes("PRO") || err.message?.includes("402")) {
        setRequiresPro(true);
        setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
      } else {
        setError(err.message || t('errors.generic'));
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  if (!isPro || requiresPro) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-yellow-500" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              {t('coach.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('coach.proRequired')}
            </p>
            <div className="pt-4">
              <Link href="/billing">
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" data-testid="button-upgrade-pro">
                  <Crown className="w-4 h-4 mr-2" />
                  {t('billing.subscribeMonthly')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2" data-testid="title-coach">
            {t('coach.title')} <span className="text-xs font-normal px-2 py-1 rounded bg-primary/20 text-primary uppercase tracking-wide">Beta</span>
          </h1>
          <p className="text-muted-foreground">{t('coach.subtitle')}</p>
        </div>

        <Card className="flex-1 flex flex-col border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  data-testid={`message-${msg.role}-${msg.id}`}
                  className={cn(
                    "flex gap-4 animate-in fade-in slide-in-from-bottom-2",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className={cn(
                    "w-10 h-10 border",
                    msg.role === "assistant" ? "bg-primary/10 border-primary/20" : "bg-secondary/10 border-secondary/20"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="flex items-center justify-center w-full h-full text-primary">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    ) : (
                      <AvatarFallback>U</AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className={cn(
                    "rounded-2xl p-4 max-w-[80%]",
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted rounded-tl-none"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] opacity-50 mt-2 block">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4" data-testid="typing-indicator">
                  <Avatar className="w-10 h-10 bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-center w-full h-full text-primary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg" data-testid="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-card/80">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex gap-2" data-testid="chat-form">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('coach.placeholder')}
                className="h-12 pl-4 pr-12 bg-background/50 border-border shadow-inner"
                data-testid="input-message"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isTyping}
                data-testid="button-send"
                className={cn(
                  "absolute right-2 top-2 h-8 w-8 transition-all",
                  input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="max-w-3xl mx-auto mt-2 flex justify-center gap-2 flex-wrap">
              <SuggestionPill onClick={() => handleSuggestion("Como counterar Megacavaleiro?")} text="Como counterar Megacavaleiro?" />
              <SuggestionPill onClick={() => handleSuggestion("Analise minha última derrota")} text="Analise minha última derrota" />
              <SuggestionPill onClick={() => handleSuggestion("Melhor deck para Arena 17")} text="Melhor deck para Arena 17" />
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SuggestionPill({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      data-testid={`suggestion-${text.substring(0, 10)}`}
      className="text-xs px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-colors"
    >
      {text}
    </button>
  )
}
