import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import { useSession } from '@/features/auth/api/use-session';
import type { Database } from '@/lib/supabase/database.types';

export type AttendanceResponse = Database['public']['Enums']['attendance_response'];

export type MyAttendancesMap = Record<string, AttendanceResponse>;

const myAttendancesKey = (userId: string | null) =>
  [...matchKeys.all, 'my-attendances', userId] as const;

async function fetchMyAttendances(userId: string): Promise<MyAttendancesMap> {
  const { data, error } = await supabase
    .from('match_attendances')
    .select('match_id, response')
    .eq('profile_id', userId);
  if (error) throw error;
  const map: MyAttendancesMap = {};
  for (const row of data ?? []) {
    map[row.match_id] = row.response;
  }
  return map;
}

export function useMyAttendances() {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: myAttendancesKey(userId),
    queryFn: () => fetchMyAttendances(userId as string),
    enabled: Boolean(userId),
    staleTime: 10_000,
  });
}

export const myAttendancesQueryKey = myAttendancesKey;
