import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type CheckInCandidate =
  Database['public']['Functions']['list_match_check_in_candidates']['Returns'][number];

async function fetchCandidates(matchId: string): Promise<CheckInCandidate[]> {
  const { data, error } = await supabase.rpc('list_match_check_in_candidates', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Players still launchable as present for a match. Admin-only RPC; the query is
 * meant to stay disabled until the launch modal opens (`enabled`).
 */
export function useMatchCheckInCandidates(matchId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: matchId
      ? matchKeys.checkInCandidates(matchId)
      : ['matches', 'check-in-candidates', 'idle'],
    queryFn: () => fetchCandidates(matchId as string),
    enabled: Boolean(matchId) && enabled,
    staleTime: 0,
  });
}
