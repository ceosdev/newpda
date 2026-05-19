import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { playerOptionKeys } from '@/features/finance/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type PlayerOption = {
  id: string;
  nickname: string | null;
  display_name: string;
  player_status: Database['public']['Enums']['player_status'];
};

async function fetchPlayerOptions(): Promise<PlayerOption[]> {
  const { data, error } = await supabase.rpc('list_player_options');
  if (error) throw error;
  return (data ?? []) as PlayerOption[];
}

export function usePlayerOptions() {
  return useQuery({
    queryKey: playerOptionKeys.all,
    queryFn: fetchPlayerOptions,
    staleTime: 30_000,
  });
}
