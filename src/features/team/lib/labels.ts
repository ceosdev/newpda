import type { Database } from '@/lib/supabase/database.types';

type PreferredPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type PlayerStatus = Database['public']['Enums']['player_status'];

export const POSITION_LABELS: Record<PreferredPosition, string> = {
  goalkeeper: 'Goleiro',
  defender: 'Defesa',
  midfielder: 'Meio',
  forward: 'Ataque',
};

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  injured: 'DM',
};

export function positionLabel(value: string | null | undefined): string {
  if (!value) return 'Sem preferência';
  return POSITION_LABELS[value as PreferredPosition] ?? value;
}

export function playerStatusLabel(value: PlayerStatus | null | undefined): string {
  if (!value) return '—';
  return PLAYER_STATUS_LABELS[value];
}
