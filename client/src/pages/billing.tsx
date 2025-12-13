import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const MONTHLY_PRICE_ID = "price_1SdgN5CnrOGKyenCuyccxmyj";
const YEARLY_PRICE_ID = "price_1SdgN5CnrOGKyenCIuDeQl5A";

const FREE_FEATURES = [
  "Estatísticas básicas",
  "Histórico de 5 batalhas",
  "Acesso à comunidade",
];

const PRO_FEATURES = [
  "Histórico ilimitado de batalhas",
  "Coach IA com análises personalizadas",
  "Exercícios de treinamento",
  "Suporte prioritário",
];

export default function BillingPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | "portal" | null>(null);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const isPro = (subscription as any)?.plan === "pro" || (subscription as any)?.status === "active";

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      toast({
        title: "Assinatura ativada!",
        description: "Bem-vindo ao plano PRO! Aproveite todos os recursos.",
      });
      setLocation("/billing", { replace: true });
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Pagamento cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "destructive",
      });
      setLocation("/billing", { replace: true });
    }
  }, [search, toast, setLocation]);

  const handleUpgrade = async (priceId: string, plan: "monthly" | "yearly") => {
    setLoadingPlan(plan);
    try {
      const { url } = await api.stripe.createCheckout(priceId);
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan("portal");
    try {
      const { url } = await api.stripe.createPortal();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Erro ao abrir portal",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Planos e Assinatura</h1>
          <p className="text-muted-foreground mt-2">
            Desbloqueie todo o potencial do CRStats com o plano PRO: análises avançadas, Coach IA e muito mais.
          </p>
        </div>

        {subscriptionLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3" data-testid="text-current-plan">
              <span className="text-sm text-muted-foreground">Seu plano atual:</span>
              <Badge variant={isPro ? "default" : "secondary"} className={cn(isPro && "bg-gradient-to-r from-yellow-500 to-orange-500")}>
                {isPro ? (
                  <>
                    <Crown className="w-3 h-3 mr-1" />
                    PRO
                  </>
                ) : (
                  "FREE"
                )}
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {/* FREE Plan */}
              <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm", !isPro && "ring-2 ring-primary/20")} data-testid="plan-free">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-display">Free</CardTitle>
                    {!isPro && <Badge variant="outline">Atual</Badge>}
                  </div>
                  <CardDescription>Perfeito para começar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-3xl font-bold">R$0</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-3">
                    {FREE_FEATURES.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!isPro && (
                    <Button variant="outline" className="w-full" disabled>
                      Plano atual
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* PRO Plan */}
              <Card className={cn("border-primary/50 bg-gradient-to-br from-card to-primary/5 backdrop-blur-sm relative overflow-hidden", isPro && "ring-2 ring-primary")} data-testid="plan-pro">
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-bl-lg">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  POPULAR
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-display flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      PRO
                    </CardTitle>
                    {isPro && <Badge>Atual</Badge>}
                  </div>
                  <CardDescription>Para jogadores sérios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1">
                    <div>
                      <span className="text-3xl font-bold">R$19,90</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ou <span className="font-semibold text-green-500">R$159,00/ano</span>{" "}
                      <Badge variant="secondary" className="text-xs">Economize 33%</Badge>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {PRO_FEATURES.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isPro ? (
                    <Button 
                      className="w-full" 
                      onClick={handleManageSubscription}
                      disabled={loadingPlan === "portal"}
                      data-testid="button-manage-subscription"
                    >
                      {loadingPlan === "portal" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Gerenciar Assinatura
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        onClick={() => handleUpgrade(MONTHLY_PRICE_ID, "monthly")}
                        disabled={loadingPlan !== null}
                        data-testid="button-upgrade-monthly"
                      >
                        {loadingPlan === "monthly" ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Assinar Mensal
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-green-500/50 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleUpgrade(YEARLY_PRICE_ID, "yearly")}
                        disabled={loadingPlan !== null}
                        data-testid="button-upgrade-yearly"
                      >
                        {loadingPlan === "yearly" ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Assinar Anual (Economize 33%)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-card/50 max-w-4xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Perguntas frequentes</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Posso cancelar a qualquer momento?</p>
                    <p>Sim! Você pode cancelar sua assinatura a qualquer momento pelo portal de gerenciamento.</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Como funciona o pagamento?</p>
                    <p>Aceitamos cartões de crédito e débito através do Stripe, uma plataforma segura de pagamentos.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
