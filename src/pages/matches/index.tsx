import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarPlus, Loader2, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useMatchesInfinite,
  type MatchWithCounts,
} from '@/features/matches/api/use-matches-infinite';
import { useMyAttendances } from '@/features/matches/api/use-my-attendances';
import { MatchCard } from '@/features/matches/components/match-card';
import { MatchForm } from '@/features/matches/components/match-form';
import { CloseMatchDialog } from '@/features/matches/components/close-match-dialog';
import { DeleteMatchDialog } from '@/features/matches/components/delete-match-dialog';
import { formatMonthLabel, monthKey } from '@/features/matches/lib/labels';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useCurrentPlayer } from '@/features/me/api/use-current-player';
import { mapSupabaseError } from '@/lib/supabase/errors';

type EditingState =
  | { mode: 'create' }
  | { mode: 'edit'; match: MatchWithCounts }
  | null;

export function MatchesPage() {
  const navigate = useNavigate();
  const { can, profile } = usePermissions();
  const canManage = can('manage_matches');
  const { data: currentPlayer } = useCurrentPlayer();
  const canRespond =
    profile?.role === 'player' &&
    (currentPlayer?.player_status === 'active' || currentPlayer?.player_status === 'injured');
  const { data: myAttendances } = useMyAttendances();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMatchesInfinite();

  const [editing, setEditing] = useState<EditingState>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const matches = useMemo<MatchWithCounts[]>(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; items: MatchWithCounts[] }[] = [];
    for (const match of matches) {
      const key = monthKey(match.match_date);
      const tail = groups[groups.length - 1];
      if (tail && tail.key === key) {
        tail.items.push(match);
      } else {
        groups.push({ key, label: formatMonthLabel(match.match_date), items: [match] });
      }
    }
    return groups;
  }, [matches]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasMatches = matches.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-1 flex-col">
          <h1 className="text-sm font-semibold tracking-tight">Peladas</h1>
          {!isLoading && !isError ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {matches.length === 1 ? '1 pelada' : `${matches.length} peladas carregadas`}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setEditing({ mode: 'create' })}
            className="hidden sm:inline-flex"
          >
            <CalendarPlus className="size-4" />
            Nova pelada
          </Button>
        ) : null}
      </header>

      <main className="flex-1 px-4 py-4 pb-24 sm:pb-4">
        <div className="mx-auto w-full max-w-5xl">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3">
                <span>{mapSupabaseError(error)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="self-start"
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : !hasMatches ? (
            <EmptyState
              icon={CalendarPlus}
              title="Nenhuma pelada agendada"
              description={
                canManage
                  ? 'Crie a primeira pelada para começar.'
                  : 'Ainda não há peladas agendadas.'
              }
              action={
                canManage ? (
                  <Button type="button" onClick={() => setEditing({ mode: 'create' })}>
                    <CalendarPlus className="size-4" />
                    Nova pelada
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-6">
                {groupedByMonth.map((group) => (
                  <section key={group.key} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </h2>
                      <div aria-hidden className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {group.items.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          canManage={canManage}
                          canRespond={canRespond}
                          myResponse={myAttendances?.[match.id] ?? null}
                          onNavigate={(id) => navigate(`/matches/${id}`)}
                          onEdit={(m) => setEditing({ mode: 'edit', match: m })}
                          onClose={setClosingId}
                          onDelete={setDeletingId}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div ref={sentinelRef} aria-hidden className="h-1" />

              {isFetchingNextPage ? (
                <div className="flex justify-center py-4">
                  <div
                    role="status"
                    aria-live="polite"
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
                  >
                    <Loader2 aria-hidden className="size-3.5 animate-spin text-primary" />
                    <span>Carregando mais peladas</span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      {canManage ? (
        <Button
          type="button"
          aria-label="Nova pelada"
          onClick={() => setEditing({ mode: 'create' })}
          className="fixed bottom-4 right-4 size-12 rounded-full shadow-lg sm:hidden"
        >
          <Plus className="size-5" />
        </Button>
      ) : null}

      <MatchForm
        {...(editing?.mode === 'edit'
          ? {
              mode: 'edit' as const,
              matchId: editing.match.id,
              matchDate: editing.match.match_date,
              matchTime: editing.match.match_time,
              status: editing.match.status,
            }
          : { mode: 'create' as const })}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />

      <CloseMatchDialog
        matchId={closingId}
        open={closingId !== null}
        onOpenChange={(open) => {
          if (!open) setClosingId(null);
        }}
      />

      <DeleteMatchDialog
        matchId={deletingId}
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      />
    </div>
  );
}
