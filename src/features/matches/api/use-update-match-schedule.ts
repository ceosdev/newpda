import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';

type Input = {
  matchId: string;
  matchDate: string;
  matchTime: string;
};

export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, matchDate, matchTime }: Input) => {
      const { data, error } = await supabase.rpc('update_match_schedule', {
        p_match_id: matchId,
        p_match_date: matchDate,
        p_match_time: matchTime,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
}
