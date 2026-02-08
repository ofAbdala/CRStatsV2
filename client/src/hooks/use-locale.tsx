import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type Locale,
  type SupportedCurrency,
  DEFAULT_LOCALE,
  detectLocale,
  getTranslations,
  localeNames,
  localeToPreferredLanguage,
  preferredLanguageToLocale,
  supportedLocales,
  t,
} from "@shared/i18n";
import { formatPrice, getCurrencyFromLocale, getPricing, getYearlySavingsPercent } from "@shared/pricing";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const LOCALE_STORAGE_KEY = "locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (savedLocale && supportedLocales.includes(savedLocale as Locale)) {
    return savedLocale as Locale;
  }

  return detectLocale(navigator.language);
}

export interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: ReturnType<typeof getTranslations>;
  pricing: ReturnType<typeof getPricing>;
  formatPrice: (amount: number) => string;
  savingsPercent: number;
  supportedLocales: Locale[];
  localeNames: Record<Locale, string>;
  preferredLanguage: "pt" | "en";
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const [currency] = useState<SupportedCurrency>(() => getCurrencyFromLocale(locale));

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get() as Promise<{ preferredLanguage?: string }>,
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const preferredLanguage = settingsQuery.data?.preferredLanguage;
    if (!preferredLanguage) return;

    const preferredLocale = preferredLanguageToLocale(preferredLanguage);
    if (preferredLocale === locale) return;

    setLocaleState(preferredLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, preferredLocale);
  }, [locale, settingsQuery.data?.preferredLanguage]);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  };

  const setCurrency = (_currency: SupportedCurrency) => {
    // Billing is fixed to BRL in this release.
  };

  const translations = useMemo(() => getTranslations(locale), [locale]);
  const pricing = useMemo(() => getPricing(currency), [currency]);
  const preferredLanguage = useMemo(() => localeToPreferredLanguage(locale), [locale]);

  const value = useMemo<LocaleContextType>(
    () => ({
      locale,
      setLocale,
      currency,
      setCurrency,
      t: (key: string, params?: Record<string, string | number>) => t(key, locale, params),
      translations,
      pricing,
      formatPrice: (amount: number) => formatPrice(amount, currency),
      savingsPercent: getYearlySavingsPercent(currency),
      supportedLocales,
      localeNames,
      preferredLanguage,
    }),
    [currency, locale, preferredLanguage, pricing, translations],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
