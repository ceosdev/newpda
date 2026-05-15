import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';

type Input = { matchId: string; playerId: string };

export function useRemoveMatchCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, playerId }: Input) => {
      const { error } = await supabase.rpc('remove_match_check_in', {
        p_match_id: matchId,
        p_player_id: playerId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.checkIns(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.checkInCandidates(matchId) });
    },
  });
}
