import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';

type Input = { matchId: string; playerIds: string[] };

export function useRecordMatchCheckIns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, playerIds }: Input) => {
      const { data, error } = await supabase.rpc('record_match_check_ins', {
        p_match_id: matchId,
        p_player_ids: playerIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.checkIns(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.checkInCandidates(matchId) });
    },
  });
}
