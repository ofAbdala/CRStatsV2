import type { Locale, SupportedCurrency } from './i18n';

export type SubscriptionTier = 'free' | 'pro' | 'elite';

export interface PricingPlan {
  monthlyPrice: number;
  monthlyPriceId: string;
  yearlyPrice?: number;
  yearlyPriceId?: string;
  currency: SupportedCurrency;
  symbol: string;
  locale: string;
}

export interface ElitePricingPlan {
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

export const ELITE_PRICING: Record<SupportedCurrency, ElitePricingPlan> = {
  BRL: {
    monthlyPrice: 39.90,
    monthlyPriceId: process.env.STRIPE_ELITE_PRICE_ID || '',
    yearlyPrice: 299.00,
    yearlyPriceId: process.env.STRIPE_ELITE_ANNUAL_PRICE_ID || '',
    currency: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
  },
};

export function getPricing(currency: SupportedCurrency): PricingPlan {
  return PRICING[currency] || PRICING.BRL;
}

export function getElitePricing(currency: SupportedCurrency): ElitePricingPlan {
  return ELITE_PRICING[currency] || ELITE_PRICING.BRL;
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

export function getEliteYearlySavingsPercent(currency: SupportedCurrency): number {
  const plan = ELITE_PRICING[currency];
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

/** Returns true if the given plan has at least PRO-level access (pro or elite). */
export function hasPaidAccess(plan: string | null | undefined): boolean {
  return plan === 'pro' || plan === 'elite';
}

/** Returns true if the given plan has Elite-level access. */
export function hasEliteAccess(plan: string | null | undefined): boolean {
  return plan === 'elite';
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['BRL'];
