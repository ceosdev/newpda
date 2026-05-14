import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { MatchWithCounts } from '@/features/matches/api/use-matches-infinite';

async function fetchMatchDetail(matchId: string): Promise<MatchWithCounts | null> {
  const { data, error } = await supabase
    .from('matches_with_counts')
    .select(
      'id, match_date, match_time, status, created_by, created_at, updated_at, going_count, maybe_count, declined_count',
    )
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MatchWithCounts | null;
}

export function useMatchDetail(matchId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.detail(matchId ?? ''),
    queryFn: () => fetchMatchDetail(matchId as string),
    enabled: Boolean(matchId),
    staleTime: 10_000,
  });
}
