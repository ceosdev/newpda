import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formats an integer amount of cents as Brazilian Real (e.g. 8000 -> "R$ 80,00"). */
export function formatBRL(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/** Lowercases and strips diacritics for accent-insensitive search/compare. */
export function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
