import type { Locale, SupportedCurrency } from './i18n';

export interface PricingPlan {
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  currency: SupportedCurrency;
  symbol: string;
  locale: string;
}

export const PRICING: Record<SupportedCurrency, PricingPlan> = {
  BRL: {
    monthlyPrice: 19.90,
    yearlyPrice: 159.00,
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_BRL || 'price_1SdgN5CnrOGKyenCuyccxmyj',
    yearlyPriceId: process.env.STRIPE_PRICE_YEARLY_BRL || 'price_1SdgN5CnrOGKyenCIuDeQl5A',
    currency: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
  },
  USD: {
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_USD || 'price_pro_usd_monthly',
    yearlyPriceId: process.env.STRIPE_PRICE_YEARLY_USD || 'price_pro_usd_yearly',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
  },
  EUR: {
    monthlyPrice: 4.49,
    yearlyPrice: 35.99,
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_EUR || 'price_pro_eur_monthly',
    yearlyPriceId: process.env.STRIPE_PRICE_YEARLY_EUR || 'price_pro_eur_yearly',
    currency: 'EUR',
    symbol: '€',
    locale: 'de-DE',
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
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = ((monthlyTotal - plan.yearlyPrice) / monthlyTotal) * 100;
  return Math.round(savings);
}

export function getCurrencyFromLocale(locale: Locale): SupportedCurrency {
  switch (locale) {
    case 'pt-BR':
      return 'BRL';
    case 'en-US':
    default:
      return 'USD';
  }
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];
