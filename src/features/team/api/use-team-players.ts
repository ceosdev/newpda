import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { teamKeys } from '@/features/team/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type PlayerListItem = Database['public']['Functions']['list_players_public']['Returns'][number];

function sortKey(item: PlayerListItem): string {
  return (item.nickname?.trim() || item.display_name).toLowerCase();
}

async function fetchTeamPlayers(): Promise<PlayerListItem[]> {
  const { data, error } = await supabase.rpc('list_players_public');
  if (error) throw error;
  return [...(data ?? [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'pt-BR'));
}

export function useTeamPlayers() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: fetchTeamPlayers,
    staleTime: 10_000,
  });
}
