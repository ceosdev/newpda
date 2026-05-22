import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { teamKeys } from '@/features/team/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type SpectatorListItem =
  Database['public']['Functions']['list_spectators']['Returns'][number];

async function fetchTeamSpectators(): Promise<SpectatorListItem[]> {
  const { data, error } = await supabase.rpc('list_spectators');
  if (error) throw error;
  return [...(data ?? [])].sort((a, b) =>
    a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase(), 'pt-BR'),
  );
}

export function useTeamSpectators() {
  return useQuery({
    queryKey: teamKeys.spectators(),
    queryFn: fetchTeamSpectators,
    staleTime: 10_000,
  });
}
