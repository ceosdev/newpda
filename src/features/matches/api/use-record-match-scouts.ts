import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import { teamKeys } from '@/features/team/api/keys';

export type ScoutPayloadEntry = {
  player_id: string;
  goals: number;
  yellow_cards: number;
  blue_cards: number;
  red_cards: number;
  wins: number;
  draws: number;
};

type Input = { matchId: string; entries: ScoutPayloadEntry[] };

export function useRecordMatchScouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, entries }: Input) => {
      const { data, error } = await supabase.rpc('record_match_scouts', {
        p_match_id: matchId,
        p_entries: entries,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.scouts(matchId) });
      // /team card aggregates total goals/points from scouts.
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}
