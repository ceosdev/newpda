import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { matchKeys } from '@/features/matches/api/keys';
import { myAttendancesQueryKey, type MyAttendancesMap } from '@/features/matches/api/use-my-attendances';
import { useSession } from '@/features/auth/api/use-session';
import type { MatchWithCounts } from '@/features/matches/api/use-matches-infinite';
import type { AttendanceResponse } from '@/features/matches/api/use-my-attendances';

type Input = {
  matchId: string;
  response: AttendanceResponse;
  previousResponse: AttendanceResponse | null;
};

type CountKey = 'going_count' | 'maybe_count' | 'declined_count';

function countKeyFor(response: AttendanceResponse): CountKey {
  if (response === 'going') return 'going_count';
  if (response === 'maybe') return 'maybe_count';
  return 'declined_count';
}

function applyDelta(
  match: MatchWithCounts,
  matchId: string,
  next: AttendanceResponse,
  previous: AttendanceResponse | null,
): MatchWithCounts {
  if (match.id !== matchId) return match;
  const updated = { ...match };
  if (previous) updated[countKeyFor(previous)] = Math.max(0, updated[countKeyFor(previous)] - 1);
  updated[countKeyFor(next)] = updated[countKeyFor(next)] + 1;
  return updated;
}

export function useSetAttendance() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async ({ matchId, response }: Input) => {
      const { data, error } = await supabase.rpc('set_my_attendance', {
        p_match_id: matchId,
        p_response: response,
      });
      if (error) throw error;
      return data;
    },

    onMutate: async ({ matchId, response, previousResponse }) => {
      const myKey = myAttendancesQueryKey(userId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: matchKeys.list() }),
        queryClient.cancelQueries({ queryKey: matchKeys.detail(matchId) }),
        queryClient.cancelQueries({ queryKey: myKey }),
      ]);

      const previousList = queryClient.getQueriesData<{
        pageParams: unknown[];
        pages: MatchWithCounts[][];
      }>({ queryKey: matchKeys.list() });

      const previousDetail = queryClient.getQueryData<MatchWithCounts | null>(
        matchKeys.detail(matchId),
      );

      const previousMy = queryClient.getQueryData<MyAttendancesMap>(myKey);

      queryClient.setQueriesData<{ pageParams: unknown[]; pages: MatchWithCounts[][] }>(
        { queryKey: matchKeys.list() },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) =>
              page.map((m) => applyDelta(m, matchId, response, previousResponse)),
            ),
          };
        },
      );

      queryClient.setQueryData<MatchWithCounts | null>(matchKeys.detail(matchId), (m) =>
        m ? applyDelta(m, matchId, response, previousResponse) : m,
      );

      queryClient.setQueryData<MyAttendancesMap>(myKey, (curr) => ({
        ...(curr ?? {}),
        [matchId]: response,
      }));

      return { previousList, previousDetail, previousMy };
    },

    onError: (_err, { matchId }, context) => {
      if (!context) return;
      for (const [key, value] of context.previousList) {
        queryClient.setQueryData(key, value);
      }
      queryClient.setQueryData(matchKeys.detail(matchId), context.previousDetail);
      queryClient.setQueryData(myAttendancesQueryKey(userId), context.previousMy);
    },

    onSettled: (_data, _err, { matchId }) => {
      // Refetch the things that just changed — ensures responded_at is correct
      // for the detail tabs and gives us authoritative counts.
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: myAttendancesQueryKey(userId) });
    },
  });
}
