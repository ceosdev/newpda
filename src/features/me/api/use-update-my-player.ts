import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { meKeys } from '@/features/me/api/keys';
import type { PreferredPosition } from '@/features/me/schemas/profile-edit.schema';

type UpdateMyPlayerInput = {
  nickname: string | null;
  preferredPosition: PreferredPosition | null;
};

export function useUpdateMyPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nickname, preferredPosition }: UpdateMyPlayerInput) => {
      const { data, error } = await supabase.rpc('update_my_player', {
        p_nickname: nickname ?? undefined,
        p_shirt_number: undefined,
        p_preferred_position: preferredPosition ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
