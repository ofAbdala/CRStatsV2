import ptBR from './translations/pt-BR.json';
import enUS from './translations/en-US.json';

export type Locale = 'pt-BR' | 'en-US';
export type SupportedCurrency = 'BRL';
export type PreferredLanguage = 'pt' | 'en';

const translations: Record<Locale, typeof ptBR> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export const DEFAULT_LOCALE: Locale = 'pt-BR';

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  
  const normalized = acceptLanguage.toLowerCase();
  
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('en')) return 'en-US';
  
  const parts = acceptLanguage.split(',');
  for (const part of parts) {
    const lang = part.split(';')[0].trim().toLowerCase();
    if (lang.startsWith('pt')) return 'pt-BR';
    if (lang.startsWith('en')) return 'en-US';
  }
  
  return DEFAULT_LOCALE;
}

export function detectCurrency(locale: Locale): SupportedCurrency {
  void locale;
  return 'BRL';
}

export function preferredLanguageToLocale(language?: string | null): Locale {
  if (!language) return DEFAULT_LOCALE;
  const normalized = language.trim().toLowerCase();
  if (normalized.startsWith("en")) return "en-US";
  return "pt-BR";
}

export function localeToPreferredLanguage(locale: Locale): PreferredLanguage {
  return locale === "en-US" ? "en" : "pt";
}

export function getCurrencyFromTimezone(): SupportedCurrency {
  return 'BRL';
}

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string 
      ? T[K] extends object 
        ? `${K}.${NestedKeyOf<T[K]>}` | K
        : K 
      : never 
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof ptBR>;

function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>
): string {
  const translation = translations[locale] || translations[DEFAULT_LOCALE];
  let value = getNestedValue(translation, key);
  
  if (!value) {
    value = getNestedValue(translations[DEFAULT_LOCALE], key);
  }
  
  if (!value) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`;
    });
  }
  
  return value;
}

export function getTranslations(locale: Locale = DEFAULT_LOCALE) {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
};

export const supportedLocales: Locale[] = ['pt-BR', 'en-US'];
