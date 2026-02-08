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
    monthlyPrice: 49.90,
    monthlyPriceId: 'price_1SdgN5CnrOGKyenCuyccxmyj',
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
  void currency;
  return 0;
}

export function getCurrencyFromLocale(locale: Locale): SupportedCurrency {
  void locale;
  return 'BRL';
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['BRL'];
