import { useMemo, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Clock, ListChecks, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeading } from '@/components/shared/section-heading';
import { useMatchDetail } from '@/features/matches/api/use-match-detail';
import {
  useMatchAttendances,
  type MatchAttendance,
} from '@/features/matches/api/use-match-attendances';
import { PlayerMiniCard } from '@/features/matches/components/player-mini-card';
import { MatchPresencesSection } from '@/features/matches/components/match-presences-section';
import { MatchScoutsSection } from '@/features/matches/components/match-scouts-section';
import {
  ATTENDANCE_EMPTY_LABELS,
  ATTENDANCE_ORDER,
  ATTENDANCE_TAB_LABELS,
  MATCH_STATUS_BADGE_CLASS,
  MATCH_STATUS_LABELS,
  formatMatchDate,
  formatMatchTime,
} from '@/features/matches/lib/labels';
import { positionLabel } from '@/features/team/lib/labels';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useSession } from '@/features/auth/api/use-session';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

function DetailHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <Button asChild variant="ghost" size="icon" aria-label="Voltar">
        <Link to="/matches">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      {children ?? <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
    </header>
  );
}

export function MatchDetailPage() {
  const { id: matchId } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const { data: session } = useSession();
  const canManage = can('manage_matches');

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
        <DetailHeader title="Pelada" />
        <main className="flex-1 px-4 py-4">
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex min-h-dvh flex-col">
        <DetailHeader title="Pelada" />
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
      <DetailHeader title="Pelada">
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
      </DetailHeader>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionHeading icon={ListChecks} label="Respostas" />

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
                        <Skeleton className="h-[60px] w-full" />
                        <Skeleton className="h-[60px] w-full" />
                      </>
                    ) : attendancesError ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {mapSupabaseError(attendancesErrObj)}
                        </AlertDescription>
                      </Alert>
                    ) : list.length === 0 ? (
                      <EmptyState icon={Users} title={ATTENDANCE_EMPTY_LABELS[response]} />
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {list.map((entry) => (
                          <PlayerMiniCard
                            key={entry.profile_id}
                            avatarUrl={entry.avatar_url}
                            primaryName={entry.nickname?.trim() || entry.display_name}
                            secondary={positionLabel(entry.preferred_position)}
                            isSelf={entry.profile_id === myUserId}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </section>

          <MatchPresencesSection matchId={match.id} canManage={canManage} />

          <MatchScoutsSection matchId={match.id} canManage={canManage} />
        </div>
      </main>
    </div>
  );
}
