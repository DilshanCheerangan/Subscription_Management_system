import { format, isValid, parseISO } from "date-fns";
import { DEFAULT_CURRENCY } from "./money";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a monetary amount into standard localized currency string (Default: INR / ₹).
 */
export function formatCurrency(amount: number | string | null | undefined, currency = DEFAULT_CURRENCY): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "₹0.00";
  
  if (currency === "INR") {
    return currencyFormatter.format(num);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats date values consistently.
 * Default pattern: "dd MMM yyyy" (e.g. 31 Oct 2026)
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  pattern = "dd MMM yyyy"
): string {
  if (!date) return "-";
  
  const parsedDate = typeof date === "string" ? parseISO(date) : new Date(date);
  if (!isValid(parsedDate)) return "-";

  return format(parsedDate, pattern);
}

/**
 * Formats date and time values.
 * Default pattern: "dd MMM yyyy, HH:mm"
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  pattern = "dd MMM yyyy, HH:mm"
): string {
  return formatDate(date, pattern);
}
