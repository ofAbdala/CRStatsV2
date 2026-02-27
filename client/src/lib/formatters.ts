/**
 * Shared formatting utilities used across billing and settings pages.
 */

/**
 * Format a date string for display, returning "-" for invalid/null values.
 */
export function formatDate(value: string | null | undefined, locale: "pt-BR" | "en-US"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/**
 * Format an amount in cents to a localised currency string.
 */
export function formatMoneyFromCents(amountInCents: number, currency: string, locale: "pt-BR" | "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((amountInCents || 0) / 100);
}
