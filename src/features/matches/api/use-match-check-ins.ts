import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type MatchCheckIn =
  Database['public']['Functions']['list_match_check_ins']['Returns'][number];

async function fetchMatchCheckIns(matchId: string): Promise<MatchCheckIn[]> {
  const { data, error } = await supabase.rpc('list_match_check_ins', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

export function useMatchCheckIns(matchId: string | undefined) {
  return useQuery({
    queryKey: matchId ? matchKeys.checkIns(matchId) : ['matches', 'check-ins', 'idle'],
    queryFn: () => fetchMatchCheckIns(matchId as string),
    enabled: Boolean(matchId),
    staleTime: 10_000,
  });
}
