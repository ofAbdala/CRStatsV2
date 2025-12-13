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
    monthlyPrice: 49.90,
    yearlyPrice: 399.00,
    monthlyPriceId: 'price_1SdgN5CnrOGKyenCuyccxmyj',
    yearlyPriceId: 'price_1SdgN5CnrOGKyenCIuDeQl5A',
    currency: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
  },
  USD: {
    monthlyPrice: 10.00,
    yearlyPrice: 80.00,
    monthlyPriceId: 'price_1SdwJRCnrOGKyenCp6kzFRYo',
    yearlyPriceId: 'price_1SdwJSCnrOGKyenCSagffo1v',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
  },
  EUR: {
    monthlyPrice: 9.00,
    yearlyPrice: 72.00,
    monthlyPriceId: 'price_1SdwJSCnrOGKyenCRrOmhorG',
    yearlyPriceId: 'price_1SdwJSCnrOGKyenCCj30dZj5',
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
