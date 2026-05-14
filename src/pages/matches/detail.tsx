import { useMemo } from 'react';
import { ArrowLeft, CalendarDays, Clock, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { useMatchDetail } from '@/features/matches/api/use-match-detail';
import {
  useMatchAttendances,
  type MatchAttendance,
} from '@/features/matches/api/use-match-attendances';
import { useMyAttendances } from '@/features/matches/api/use-my-attendances';
import { AttendanceControls } from '@/features/matches/components/attendance-controls';
import { AttendancePlayerCard } from '@/features/matches/components/attendance-player-card';
import {
  ATTENDANCE_EMPTY_LABELS,
  ATTENDANCE_ORDER,
  ATTENDANCE_TAB_LABELS,
  MATCH_STATUS_BADGE_CLASS,
  MATCH_STATUS_LABELS,
  formatMatchDate,
  formatMatchTime,
} from '@/features/matches/lib/labels';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useCurrentPlayer } from '@/features/me/api/use-current-player';
import { useSession } from '@/features/auth/api/use-session';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

export function MatchDetailPage() {
  const { id: matchId } = useParams<{ id: string }>();
  const { profile } = usePermissions();
  const { data: session } = useSession();
  const { data: currentPlayer } = useCurrentPlayer();
  const { data: myAttendances } = useMyAttendances();

  const canRespond =
    profile?.role === 'player' &&
    (currentPlayer?.player_status === 'active' || currentPlayer?.player_status === 'injured');

  const {
    data: match,
    isLoading: matchLoading,
    isError: matchError,
    error: matchErrObj,
  } = useMatchDetail(matchId);

  const {
    data: attendances,
    isLoading: attendancesLoading,
    isError: attendancesError,
    error: attendancesErrObj,
  } = useMatchAttendances(matchId);

  const myUserId = session?.user.id ?? null;
  const myResponse = matchId ? (myAttendances?.[matchId] ?? null) : null;
  const isOpen = match?.status === 'open';

  const grouped = useMemo(() => {
    const buckets: Record<string, MatchAttendance[]> = { going: [], maybe: [], declined: [] };
    for (const entry of attendances ?? []) {
      buckets[entry.response]?.push(entry);
    }
    return buckets;
  }, [attendances]);

  if (matchLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link to="/matches">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold tracking-tight">Pelada</h1>
        </header>
        <main className="flex-1 px-4 py-4">
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link to="/matches">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold tracking-tight">Pelada</h1>
        </header>
        <main className="flex-1 px-4 py-4">
          <Alert variant="destructive">
            <AlertDescription>
              {match ? 'Pelada não encontrada.' : mapSupabaseError(matchErrObj)}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/matches">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            {formatMatchDate(match.match_date)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
            <Clock aria-hidden className="size-4" />
            {formatMatchTime(match.match_time)}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            MATCH_STATUS_BADGE_CLASS[match.status],
          )}
        >
          {MATCH_STATUS_LABELS[match.status]}
        </span>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {canRespond && isOpen ? (
            <AttendanceControls matchId={match.id} currentResponse={myResponse} />
          ) : null}

          <Tabs defaultValue="going" className="gap-3">
            <TabsList className="grid w-full grid-cols-3">
              {ATTENDANCE_ORDER.map((response) => {
                const count =
                  response === 'going'
                    ? match.going_count
                    : response === 'maybe'
                      ? match.maybe_count
                      : match.declined_count;
                return (
                  <TabsTrigger key={response} value={response}>
                    {ATTENDANCE_TAB_LABELS[response]}
                    <span className="ml-1 text-[10px] tabular-nums text-muted-foreground/80">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {ATTENDANCE_ORDER.map((response) => {
              const list = grouped[response] ?? [];
              return (
                <TabsContent key={response} value={response} className="flex flex-col gap-2">
                  {attendancesLoading ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : attendancesError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{mapSupabaseError(attendancesErrObj)}</AlertDescription>
                    </Alert>
                  ) : list.length === 0 ? (
                    <EmptyState icon={Users} title={ATTENDANCE_EMPTY_LABELS[response]} />
                  ) : (
                    list.map((entry) => (
                      <AttendancePlayerCard
                        key={entry.profile_id}
                        entry={entry}
                        isSelf={entry.profile_id === myUserId}
                      />
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

