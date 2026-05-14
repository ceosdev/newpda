import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';

type Input = {
  matchDate: string;
  matchTime: string;
};

export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchDate, matchTime }: Input) => {
      const { data, error } = await supabase.rpc('create_match', {
        p_match_date: matchDate,
        p_match_time: matchTime,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Drop the entire infinite cache so the list snaps back to page 0 with
      // the freshly created pelada at the top — by spec, scroll history is
      // discarded on create.
      queryClient.removeQueries({ queryKey: matchKeys.list() });
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
}
