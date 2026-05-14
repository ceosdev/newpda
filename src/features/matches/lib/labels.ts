import type { Database } from '@/lib/supabase/database.types';

export type MatchStatus = Database['public']['Enums']['match_status'];
export type AttendanceResponse = Database['public']['Enums']['attendance_response'];

export const ATTENDANCE_LABELS: Record<AttendanceResponse, string> = {
  going: 'Eu vou',
  declined: 'Eu não vou',
  maybe: 'Talvez',
};

export const ATTENDANCE_TAB_LABELS: Record<AttendanceResponse, string> = {
  going: 'Confirmados',
  declined: 'Não vão',
  maybe: 'Talvez',
};

export const ATTENDANCE_EMPTY_LABELS: Record<AttendanceResponse, string> = {
  going: 'Ninguém confirmou ainda',
  declined: 'Ninguém disse que não vai',
  maybe: 'Ninguém disse que talvez',
};

// Display order across UI surfaces (card buttons, tabs): Confirmados | Não vão | Talvez.
export const ATTENDANCE_ORDER: AttendanceResponse[] = ['going', 'declined', 'maybe'];

export const ATTENDANCE_CHIP_CLASS: Record<AttendanceResponse, string> = {
  going: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  declined: 'bg-destructive/10 text-destructive',
  maybe: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  open: 'Aberta',
  closed: 'Fechada',
};

export const MATCH_STATUS_BADGE_CLASS: Record<MatchStatus, string> = {
  open: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  closed: 'bg-muted text-muted-foreground',
};

// Until the future config screen lets the admin pick a default, kick-off time
// is fixed at 20:00 in the front for new pelada forms only.
export const DEFAULT_MATCH_TIME = '20:00';

export function formatMatchDate(iso: string): string {
  // match_date is naive (no TZ). Avoid `new Date()` parsing pitfalls.
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatMatchTime(value: string): string {
  // Postgres time comes back as 'HH:MM:SS' — trim seconds for display.
  return value.slice(0, 5);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  const date = new Date(Number(y), Number(m) - 1, 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${monthName}/${y}`;
}

export function todayLocalIso(): string {
  // Local-day YYYY-MM-DD without UTC drift from toISOString().
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
