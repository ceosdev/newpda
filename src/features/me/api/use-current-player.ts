import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { meKeys } from '@/features/me/api/keys';
import { useSession } from '@/features/auth/api/use-session';
import type { Database } from '@/lib/supabase/database.types';

export type CurrentPlayer = Pick<
  Database['public']['Tables']['players']['Row'],
  'id' | 'nickname' | 'shirt_number' | 'preferred_position' | 'is_monthly' | 'player_status'
>;

async function fetchCurrentPlayer(userId: string): Promise<CurrentPlayer | null> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nickname, shirt_number, preferred_position, is_monthly, player_status')
    .eq('profile_id', userId)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useCurrentPlayer() {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: meKeys.player(),
    queryFn: () => fetchCurrentPlayer(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
