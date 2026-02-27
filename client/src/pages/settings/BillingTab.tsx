/**
 * BillingTab -- Subscription plan and invoice history.
 *
 * Extracted from the original settings.tsx (Story 1.10, TD-023).
 */

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { formatDate, formatMoneyFromCents } from "@/lib/formatters";
import type { InvoiceData, SubscriptionData } from "./types";

export function BillingTab() {
  const [, setLocation] = useLocation();
  const { t, locale } = useLocale();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionData>,
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => api.billing.getInvoices() as Promise<InvoiceData[]>,
  });

  const subscription = subscriptionQuery.data;
  const invoices = invoicesQuery.data || [];

  const inferredCycle = (() => {
    const first = invoices[0];
    if (!first?.periodStart || !first?.periodEnd) return null;
    const start = new Date(first.periodStart);
    const end = new Date(first.periodEnd);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(diffDays) || diffDays <= 0) return null;
    return diffDays > 200 ? "yearly" : "monthly";
  })();

  return (
    <div className="space-y-6">
      <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {t("settings.billing.currentPlan")}
            <Button size="sm" className="font-bold" onClick={() => setLocation("/billing")}>
              {t("settings.billing.upgrade")}
            </Button>
          </CardTitle>
          <CardDescription>{t("settings.billing.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t("settings.billing.planLabel")}</span>
              <span className="font-medium uppercase">{subscription?.plan || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t("settings.billing.statusLabel")}</span>
              <span className="font-medium">{subscription?.status || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t("settings.billing.cycleLabel")}</span>
              <span className="font-medium">
                {inferredCycle === "yearly"
                  ? t("billing.yearly")
                  : inferredCycle === "monthly"
                    ? t("billing.monthly")
                    : "-"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">{t("settings.billing.nextRenewal")}</span>
              <span className="font-medium">{formatDate(subscription?.currentPeriodEnd, locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>{t("settings.billing.invoiceHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("settings.billing.emptyInvoices")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pages.billing.invoices.table.date")}</TableHead>
                  <TableHead>{t("pages.billing.invoices.table.status")}</TableHead>
                  <TableHead>{t("pages.billing.invoices.table.amount")}</TableHead>
                  <TableHead className="text-right">{t("pages.billing.invoices.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.slice(0, 5).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDate(invoice.createdAt, locale)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatMoneyFromCents(
                        invoice.amountPaid || invoice.amountDue || 0,
                        invoice.currency || "BRL",
                        locale,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          {t("pages.billing.invoices.open")}
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
  );
}
