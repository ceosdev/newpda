import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { teamKeys } from '@/features/team/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type PlayerDetail = Database['public']['Functions']['get_player_detail']['Returns'][number];

async function fetchPlayerDetail(targetId: string): Promise<PlayerDetail | null> {
  const { data, error } = await supabase.rpc('get_player_detail', { p_target: targetId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export function usePlayerDetail(targetId: string | null) {
  return useQuery({
    queryKey: teamKeys.detail(targetId),
    queryFn: () => fetchPlayerDetail(targetId as string),
    enabled: Boolean(targetId),
    staleTime: 10_000,
  });
}
