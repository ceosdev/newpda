import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { teamKeys } from '@/features/team/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type PlayerStatus = Database['public']['Enums']['player_status'];

type Input = {
  targetId: string;
  status: PlayerStatus;
  note?: string | null;
};

export function useAdminUpdatePlayerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, status, note }: Input) => {
      const { data, error } = await supabase.rpc('admin_update_player_status', {
        p_target_profile: targetId,
        p_status: status,
        p_note: note ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
