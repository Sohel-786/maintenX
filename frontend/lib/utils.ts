import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as formatDateFns, isValid as isValidDateFns } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateInput = string | number | Date | null | undefined;

function toValidDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValidDateFns(d) ? d : null;
}

/** UI date format: dd/MM/yyyy */
export function formatDate(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "dd/MM/yyyy");
}

/** UI date-time format: dd/MM/yyyy, hh:mm AM/PM */
export function formatDateTime(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "dd/MM/yyyy, hh:mm a");
}

/** UI time format: hh:mm AM/PM */
export function formatTime(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "hh:mm a");
}

/** For date-only strings (yyyy-MM-dd) stored in state, show with time at midnight. */
export function formatDateOnlyAsDateTime(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "—";
  const d = toValidDate(`${dateOnly}T00:00:00`);
  if (!d) return "—";
  return formatDateTime(d);
}

/** For date-only strings (yyyy-MM-dd) stored in state, show date only. */
export function formatDateOnly(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "—";
  const d = toValidDate(`${dateOnly}T00:00:00`);
  if (!d) return "—";
  return formatDate(d);
}

/** Professional money/rate formatting with thousand separators and 2 decimals (e.g. 1,23,456.00 for INR-style, 1,234,567.89 otherwise). */
export function formatRate(value: number | string | null | undefined, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; locale?: string }) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "0.00";
  const num = typeof value === "number" ? value : Number(value);
  const locale = options?.locale ?? "en-IN";
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: true,
  }).format(num);
}

/** Format GST number in a clean, uppercase, grouped way (e.g. 27AAACX1234Q1Z5 → 27 AAA CX1234Q 1Z5). */
export function formatGst(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = value.replace(/\s+/g, "").toUpperCase();
  // Typical GSTIN is 15 chars; group as 2-3-5-1-4 for readability.
  if (raw.length !== 15) return raw;
  return `${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5, 10)} ${raw.slice(10, 11)} ${raw.slice(11)}`;
}
