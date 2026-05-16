import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeading } from '@/components/shared/section-heading';
import { PlayerMiniCard } from '@/features/matches/components/player-mini-card';
import { RecordScoutsModal } from '@/features/matches/components/record-scouts-modal';
import { useMatchScouts, type MatchScout } from '@/features/matches/api/use-match-scouts';
import { positionLabel } from '@/features/team/lib/labels';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type MatchScoutsSectionProps = {
  matchId: string;
  /** whether the viewer can launch scouts (admin) */
  canManage: boolean;
};

function playerName(s: MatchScout): string {
  return s.nickname?.trim() || s.display_name;
}

function byName(a: MatchScout, b: MatchScout): number {
  return playerName(a).localeCompare(playerName(b), 'pt-BR');
}

function points(s: MatchScout): number {
  return s.wins * 3 + s.draws;
}

function isGoalkeeper(s: MatchScout): boolean {
  return s.preferred_position === 'goalkeeper';
}

// Overall presence frequency — the Performance tabs' tie-breaker.
function frequency(s: MatchScout): number {
  if (s.total_match_count <= 0) return 0;
  return s.check_in_count / s.total_match_count;
}

function frequencyLabel(s: MatchScout): string {
  if (s.total_match_count <= 0) return '—';
  return `${Math.round(frequency(s) * 100)}%`;
}

// Performance ranking: points, then frequency, then alphabetical.
function byPerformance(a: MatchScout, b: MatchScout): number {
  return points(b) - points(a) || frequency(b) - frequency(a) || byName(a, b);
}

// Each Performance tab keeps its ranking short; the rest is one tap away.
const PERFORMANCE_PREVIEW = 8;
const GOALKEEPER_PERFORMANCE_PREVIEW = 1;

const TAB_TRIGGER_CLASS = 'min-w-[88px] px-2 text-[11px]';

type CountTab = {
  value: string;
  label: string;
  emptyLabel: string;
  get: (s: MatchScout) => number;
  badgeClass: string;
};

const COUNT_TABS: CountTab[] = [
  {
    value: 'goals',
    label: 'Gols',
    emptyLabel: 'Nenhum gol lançado.',
    get: (s) => s.goals,
    badgeClass: 'bg-primary/10 text-primary',
  },
  {
    value: 'yellow',
    label: 'Amarelos',
    emptyLabel: 'Nenhum cartão amarelo.',
    get: (s) => s.yellow_cards,
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'blue',
    label: 'Azuis',
    emptyLabel: 'Nenhum cartão azul.',
    get: (s) => s.blue_cards,
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  {
    value: 'red',
    label: 'Vermelhos',
    emptyLabel: 'Nenhum cartão vermelho.',
    get: (s) => s.red_cards,
    badgeClass: 'bg-destructive/10 text-destructive',
  },
];

function CountBadge({ value, className }: { value: number; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm font-semibold tabular-nums',
        className,
      )}
    >
      {value}
    </span>
  );
}

function ScoutGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>;
}

/** Ranked player list (points/frequency) with a collapsed preview + toggle. */
function PerformanceTabContent({
  list,
  preview,
  emptyLabel,
}: {
  list: MatchScout[];
  preview: number;
  emptyLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (list.length === 0) {
    return <EmptyState icon={Target} title={emptyLabel} />;
  }

  const visible = expanded ? list : list.slice(0, preview);
  const hidden = list.length - visible.length;

  return (
    <>
      <ScoutGrid>
        {visible.map((s) => (
          <PlayerMiniCard
            key={s.player_id}
            avatarUrl={s.avatar_url}
            primaryName={playerName(s)}
            secondary={positionLabel(s.preferred_position)}
            trailing={
              <div className="flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold tabular-nums">{points(s)} pts</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {s.wins}v · {s.draws}e · {frequencyLabel(s)}
                </span>
              </div>
            }
          />
        ))}
      </ScoutGrid>
      {list.length > preview ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              Ver mais ({hidden})
            </>
          )}
        </button>
      ) : null}
    </>
  );
}

export function MatchScoutsSection({ matchId, canManage }: MatchScoutsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isRefetching } = useMatchScouts(matchId);
  const scouts = data ?? [];

  const rankedPerf = scouts.filter((s) => s.wins + s.draws > 0).sort(byPerformance);
  const perfLineList = rankedPerf.filter((s) => !isGoalkeeper(s));
  const goalkeeperList = rankedPerf.filter(isGoalkeeper);

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        icon={Target}
        label="Scouts"
        action={
          canManage ? (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Lançar scouts
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <ScoutGrid>
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </ScoutGrid>
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
      ) : scouts.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Lance as presenças desta pelada antes de registrar os scouts."
        />
      ) : (
        <Tabs defaultValue="goals" className="gap-3">
          <TabsList className="flex w-full justify-start overflow-x-auto sm:overflow-x-visible">
            {COUNT_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER_CLASS}>
                {tab.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="performance" className={TAB_TRIGGER_CLASS}>
              Performance
            </TabsTrigger>
            <TabsTrigger value="goalkeepers" className={TAB_TRIGGER_CLASS}>
              Goleiros
            </TabsTrigger>
          </TabsList>

          {COUNT_TABS.map((tab) => {
            const list = scouts
              .filter((s) => tab.get(s) > 0)
              .sort((a, b) => tab.get(b) - tab.get(a) || byName(a, b));
            return (
              <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-2">
                {list.length === 0 ? (
                  <EmptyState icon={Target} title={tab.emptyLabel} />
                ) : (
                  <ScoutGrid>
                    {list.map((s) => (
                      <PlayerMiniCard
                        key={s.player_id}
                        avatarUrl={s.avatar_url}
                        primaryName={playerName(s)}
                        secondary={positionLabel(s.preferred_position)}
                        trailing={<CountBadge value={tab.get(s)} className={tab.badgeClass} />}
                      />
                    ))}
                  </ScoutGrid>
                )}
              </TabsContent>
            );
          })}

          <TabsContent value="performance" className="flex flex-col gap-2">
            <PerformanceTabContent
              list={perfLineList}
              preview={PERFORMANCE_PREVIEW}
              emptyLabel="Nenhuma vitória ou empate lançado."
            />
          </TabsContent>

          <TabsContent value="goalkeepers" className="flex flex-col gap-2">
            <PerformanceTabContent
              list={goalkeeperList}
              preview={GOALKEEPER_PERFORMANCE_PREVIEW}
              emptyLabel="Nenhuma vitória ou empate de goleiro lançado."
            />
          </TabsContent>
        </Tabs>
      )}

      {canManage ? (
        <RecordScoutsModal matchId={matchId} open={modalOpen} onOpenChange={setModalOpen} />
      ) : null}
    </section>
  );
}
