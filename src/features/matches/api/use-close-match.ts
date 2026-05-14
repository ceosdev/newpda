import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';

type Input = { matchId: string };

export function useCloseMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId }: Input) => {
      const { data, error } = await supabase.rpc('close_match', {
        p_match_id: matchId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
}
