import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { teamKeys } from '@/features/team/api/keys';

export type PreferredPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

type Input = {
  targetId: string;
  position: PreferredPosition | null;
};

export function useAdminUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, position }: Input) => {
      const { data, error } = await supabase.rpc('admin_update_player_position', {
        p_target_profile: targetId,
        p_position: position ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
