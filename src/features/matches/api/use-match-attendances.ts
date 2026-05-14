import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type MatchAttendance =
  Database['public']['Functions']['list_match_attendances']['Returns'][number];

const attendanceKey = (matchId: string) => [...matchKeys.detail(matchId), 'attendances'] as const;

async function fetchMatchAttendances(matchId: string): Promise<MatchAttendance[]> {
  const { data, error } = await supabase.rpc('list_match_attendances', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

export function useMatchAttendances(matchId: string | undefined) {
  return useQuery({
    queryKey: matchId ? attendanceKey(matchId) : ['matches', 'attendances', 'idle'],
    queryFn: () => fetchMatchAttendances(matchId as string),
    enabled: Boolean(matchId),
    staleTime: 10_000,
  });
}

export const matchAttendancesKey = attendanceKey;
