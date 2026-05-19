// Shared date helpers for naive (no-TZ) `YYYY-MM-DD` strings — used by the
// matches and finance features. `new Date(iso)` parses as UTC and drifts, so
// these split the string by hand.

/** `'2026-05-18'` -> `'2026-05'` — the month bucket key. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** `'2026-05-18'` -> `'maio/2026'`. */
export function formatMonthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  const date = new Date(Number(y), Number(m) - 1, 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${monthName}/${y}`;
}

/** `'2026-05-18'` -> `'18/05/2026'`. */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** `'2026-05-18'` -> `'18/05'`. */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

/** Local-day `YYYY-MM-DD` without the UTC drift of `toISOString()`. */
export function todayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
