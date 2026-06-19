import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string, currency = 'USD', locale = 'en-US') {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(d));
}
