import { useState, useEffect, useMemo } from 'react';
import { 
  type Locale, 
  type SupportedCurrency,
  DEFAULT_LOCALE,
  t,
  getTranslations,
  detectLocale,
  supportedLocales,
  localeNames
} from '@shared/i18n';
import { getPricing, formatPrice, getYearlySavingsPercent, getCurrencyFromLocale } from '@shared/pricing';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('locale');
      if (stored && supportedLocales.includes(stored as Locale)) {
        return stored as Locale;
      }
      return detectLocale(navigator.language);
    }
    return DEFAULT_LOCALE;
  });

  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currency');
      if (stored && ['BRL', 'USD', 'EUR'].includes(stored)) {
        return stored as SupportedCurrency;
      }
    }
    return getCurrencyFromLocale(locale);
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const translations = useMemo(() => getTranslations(locale), [locale]);
  const pricing = useMemo(() => getPricing(currency), [currency]);

  // Returns string for most translations, casts arrays to key for safety
  const translate = (key: string, params?: Record<string, string | number>): string => {
    const result = t(key, locale, params);
    if (Array.isArray(result)) {
      return result.join(', '); // Fallback for arrays used as strings
    }
    return result;
  };

  // Returns array translations (for feature lists, etc.)
  const translateArray = (key: string): string[] => {
    const result = t(key, locale);
    return Array.isArray(result) ? result : [result];
  };

  const format = (amount: number): string => {
    return formatPrice(amount, currency);
  };

  const savingsPercent = useMemo(() => getYearlySavingsPercent(currency), [currency]);

  return {
    locale,
    setLocale,
    currency,
    setCurrency,
    t: translate,
    tArray: translateArray,
    translations,
    pricing,
    formatPrice: format,
    savingsPercent,
    supportedLocales,
    localeNames,
  };
}

export type LocaleContextType = ReturnType<typeof useLocale>;
