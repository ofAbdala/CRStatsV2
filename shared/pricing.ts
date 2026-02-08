import type { Locale, SupportedCurrency } from './i18n';

export interface PricingPlan {
  monthlyPrice: number;
  monthlyPriceId: string;
  yearlyPrice?: number;
  yearlyPriceId?: string;
  currency: SupportedCurrency;
  symbol: string;
  locale: string;
}

export const PRICING: Record<SupportedCurrency, PricingPlan> = {
  BRL: {
    monthlyPrice: 19.90,
    monthlyPriceId: 'price_1SdgN5CnrOGKyenCuyccxmyj',
    yearlyPrice: 159.00,
    yearlyPriceId: 'price_1SdgN5CnrOGKyenCIuDeQl5A',
    currency: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
  },
};

export function getPricing(currency: SupportedCurrency): PricingPlan {
  return PRICING[currency] || PRICING.BRL;
}

export function formatPrice(amount: number, currency: SupportedCurrency): string {
  const plan = PRICING[currency];
  
  try {
    return new Intl.NumberFormat(plan.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${plan.symbol}${amount.toFixed(2)}`;
  }
}

export function getYearlySavingsPercent(currency: SupportedCurrency): number {
  const plan = PRICING[currency];
  const yearlyPrice = plan?.yearlyPrice;

  if (!plan || typeof yearlyPrice !== "number") return 0;

  const monthlyTotal = plan.monthlyPrice * 12;
  if (!Number.isFinite(monthlyTotal) || monthlyTotal <= 0) return 0;

  const savings = monthlyTotal - yearlyPrice;
  if (!Number.isFinite(savings) || savings <= 0) return 0;

  return Math.round((savings / monthlyTotal) * 100);
}

export function getCurrencyFromLocale(locale: Locale): SupportedCurrency {
  void locale;
  return 'BRL';
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['BRL'];
