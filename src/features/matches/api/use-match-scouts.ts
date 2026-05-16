import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type MatchScout =
  Database['public']['Functions']['list_match_scouts']['Returns'][number];

async function fetchMatchScouts(matchId: string): Promise<MatchScout[]> {
  const { data, error } = await supabase.rpc('list_match_scouts', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

export function useMatchScouts(matchId: string | undefined) {
  return useQuery({
    queryKey: matchId ? matchKeys.scouts(matchId) : ['matches', 'scouts', 'idle'],
    queryFn: () => fetchMatchScouts(matchId as string),
    enabled: Boolean(matchId),
    staleTime: 10_000,
  });
}
