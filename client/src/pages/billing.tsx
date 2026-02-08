import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PRICING } from "@shared/pricing";
import { cn } from "@/lib/utils";
import { AlertCircle, Crown, ExternalLink, Loader2, ReceiptText } from "lucide-react";

interface SubscriptionResponse {
  plan?: string;
  status?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}

interface BillingInvoice {
  id: string;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatMoneyFromCents(amountInCents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((amountInCents || 0) / 100);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function BillingPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeAction, setActiveAction] = useState<"checkout" | "portal" | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionResponse>,
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => api.billing.getInvoices() as Promise<BillingInvoice[]>,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.stripe.createCheckout(PRICING.BRL.monthlyPriceId, "BRL"),
    onMutate: () => setActiveAction("checkout"),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha no checkout",
        description: getErrorMessage(error, "Não foi possível iniciar a assinatura."),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.stripe.createPortal(),
    onMutate: () => setActiveAction("portal"),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: unknown) => {
      toast({
        title: "Falha ao abrir portal",
        description: getErrorMessage(error, "Não foi possível abrir o portal de cobrança."),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      toast({
        title: "Assinatura ativada",
        description: "Seu plano PRO foi ativado com sucesso.",
      });
      setLocation("/billing", { replace: true });
    }
    if (params.get("canceled") === "true") {
      toast({
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "destructive",
      });
      setLocation("/billing", { replace: true });
    }
  }, [search, setLocation, toast]);

  const subscription = subscriptionQuery.data;
  const invoices = invoicesQuery.data || [];

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  const renewalText = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return "Sem renovação ativa";
    if (subscription.cancelAtPeriodEnd) {
      return `Cancelamento agendado para ${formatDate(subscription.currentPeriodEnd)}`;
    }
    return `Renovação em ${formatDate(subscription.currentPeriodEnd)}`;
  }, [subscription?.cancelAtPeriodEnd, subscription?.currentPeriodEnd]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Billing</h1>
          <p className="text-muted-foreground">Plano único: PRO mensal em BRL.</p>
        </div>

        {(subscriptionQuery.isError || invoicesQuery.isError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getErrorMessage(subscriptionQuery.error || invoicesQuery.error, "Falha ao carregar dados de billing.")}
            </AlertDescription>
          </Alert>
        )}

        {subscriptionQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando assinatura...
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 bg-card/50" data-testid="billing-plan-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  PRO mensal (BRL)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isPro ? "default" : "secondary"} className={cn(isPro && "bg-gradient-to-r from-yellow-500 to-orange-500")}>
                    {isPro ? "PRO ativo" : "Plano FREE"}
                  </Badge>
                  <Badge variant="outline">{formatMoneyFromCents(Math.round(PRICING.BRL.monthlyPrice * 100), "BRL")}/mês</Badge>
                </div>

                <p className="text-sm text-muted-foreground">{renewalText}</p>

                <div className="grid md:grid-cols-2 gap-3">
                  <FeatureItem text="Coach ilimitado" />
                  <FeatureItem text="Push analysis completo" />
                  <FeatureItem text="Training center PRO" />
                  <FeatureItem text="Acesso ao portal Stripe" />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {isPro ? (
                    <Button
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending || checkoutMutation.isPending}
                      data-testid="button-manage-subscription"
                    >
                      {activeAction === "portal" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Gerenciar assinatura
                    </Button>
                  ) : (
                    <Button
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending || portalMutation.isPending}
                      data-testid="button-upgrade-pro-brl"
                    >
                      {activeAction === "checkout" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Assinar PRO mensal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50" data-testid="billing-status-card">
              <CardHeader>
                <CardTitle className="text-base">Status da assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-medium uppercase">{subscription?.plan || "free"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{subscription?.status || "inactive"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Próximo ciclo</span>
                  <span className="font-medium text-right">{formatDate(subscription?.currentPeriodEnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelamento ao fim</span>
                  <span className="font-medium">{subscription?.cancelAtPeriodEnd ? "Sim" : "Não"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-border/50 bg-card/50" data-testid="billing-invoices-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5" />
              Histórico de faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesQuery.isLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando faturas...
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada para esta conta.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor pago</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.status || "unknown"}</Badge>
                      </TableCell>
                      <TableCell>{formatMoneyFromCents(invoice.amountPaid || invoice.amountDue || 0, invoice.currency || "BRL")}</TableCell>
                      <TableCell>
                        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            Abrir
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2 text-sm">
      {text}
    </div>
  );
}
