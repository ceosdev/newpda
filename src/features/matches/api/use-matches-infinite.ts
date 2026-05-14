import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

// View matches_with_counts mirrors matches and adds 3 aggregated counters.
// The generated view type marks every column as nullable (Postgres limitation),
// but every base column is NOT NULL in matches and the counters use coalesce(0).
// We narrow to a non-null shape at the boundary.
export type MatchWithCounts = {
  id: string;
  match_date: string;
  match_time: string;
  status: Database['public']['Enums']['match_status'];
  created_by: string;
  created_at: string;
  updated_at: string;
  going_count: number;
  maybe_count: number;
  declined_count: number;
};

export const MATCHES_PAGE_SIZE = 5;

async function fetchMatchesPage(pageIndex: number): Promise<MatchWithCounts[]> {
  const from = pageIndex * MATCHES_PAGE_SIZE;
  const to = from + MATCHES_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('matches_with_counts')
    .select(
      'id, match_date, match_time, status, created_by, created_at, updated_at, going_count, maybe_count, declined_count',
    )
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? []) as MatchWithCounts[];
}

export function useMatchesInfinite() {
  return useInfiniteQuery({
    queryKey: matchKeys.list(),
    queryFn: ({ pageParam }) => fetchMatchesPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MATCHES_PAGE_SIZE) return undefined;
      return allPages.length;
    },
    staleTime: 10_000,
  });
}
