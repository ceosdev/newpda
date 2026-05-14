import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type Match = Database['public']['Tables']['matches']['Row'];

export const MATCHES_PAGE_SIZE = 10;

async function fetchMatchesPage(pageIndex: number): Promise<Match[]> {
  const from = pageIndex * MATCHES_PAGE_SIZE;
  const to = from + MATCHES_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('matches')
    .select('id, match_date, match_time, status, created_by, created_at, updated_at')
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data ?? [];
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
