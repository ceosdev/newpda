import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Shield, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeading } from '@/components/shared/section-heading';
import { useTeamPlayers, type PlayerListItem } from '@/features/team/api/use-team-players';
import { PlayerListCard } from '@/features/team/components/player-list-card';
import { PlayerDetailSheet } from '@/features/team/components/player-detail-sheet';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { normalize } from '@/lib/utils';

function filterPlayers(players: PlayerListItem[], query: string): PlayerListItem[] {
  const q = normalize(query);
  if (!q) return players;
  return players.filter((p) => {
    const haystack = normalize(`${p.nickname ?? ''} ${p.display_name}`);
    return haystack.includes(q);
  });
}

type TabId = 'active' | 'inactive';

function TeamSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar jogador"
        className="pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function PlayersGrid({
  players,
  onSelect,
}: {
  players: PlayerListItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => (
        <PlayerListCard key={player.profile_id} player={player} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function TeamPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useTeamPlayers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('active');
  const [queryActive, setQueryActive] = useState('');
  const [queryInactive, setQueryInactive] = useState('');

  const { activeRoster, inactiveRoster } = useMemo(() => {
    const active: PlayerListItem[] = [];
    const inactive: PlayerListItem[] = [];
    for (const p of data ?? []) {
      if (p.player_status === 'inactive') inactive.push(p);
      else active.push(p);
    }
    return { activeRoster: active, inactiveRoster: inactive };
  }, [data]);

  const filteredActive = useMemo(
    () => filterPlayers(activeRoster, queryActive),
    [activeRoster, queryActive],
  );
  const filteredInactive = useMemo(
    () => filterPlayers(inactiveRoster, queryInactive),
    [inactiveRoster, queryInactive],
  );

  const { goalkeepers, fieldPlayers } = useMemo(() => {
    const gks: PlayerListItem[] = [];
    const others: PlayerListItem[] = [];
    for (const p of filteredActive) {
      if (p.preferred_position === 'goalkeeper') gks.push(p);
      else others.push(p);
    }
    return { goalkeepers: gks, fieldPlayers: others };
  }, [filteredActive]);

  const totalActive = activeRoster.length;
  const totalInactive = inactiveRoster.length;
  const totalAll = totalActive + totalInactive;

  const isFilteringActive = queryActive.trim().length > 0;
  const isFilteringInactive = queryInactive.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight">Time</h1>
          {!isLoading && !isError ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {totalAll === 1 ? '1 membro' : `${totalAll} membros`}
            </p>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
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
          ) : totalAll === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum jogador ainda"
              description="Quando alguém for aprovado como jogador, aparece aqui."
            />
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="gap-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  Ativos
                  <span className="ml-1 text-[10px] tabular-nums text-muted-foreground/80">
                    {totalActive}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inativos
                  <span className="ml-1 text-[10px] tabular-nums text-muted-foreground/80">
                    {totalInactive}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="flex flex-col gap-4">
                <TeamSearchInput
                  value={queryActive}
                  onChange={setQueryActive}
                  placeholder="Buscar entre ativos e DM"
                />

                {filteredActive.length === 0 ? (
                  isFilteringActive ? (
                    <EmptyState
                      icon={Search}
                      title={`Nada para "${queryActive.trim()}"`}
                      description="Tente outro nome ou apelido."
                    />
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="Sem jogadores ativos"
                      description="Quando alguém estiver com status ativo ou DM, aparece aqui."
                    />
                  )
                ) : (
                  <>
                    {goalkeepers.length > 0 ? (
                      <section className="flex flex-col gap-2">
                        <SectionHeading icon={Shield} label="Goleiros" count={goalkeepers.length} />
                        <PlayersGrid players={goalkeepers} onSelect={setSelectedId} />
                      </section>
                    ) : null}
                    {fieldPlayers.length > 0 ? (
                      <section className="flex flex-col gap-2">
                        <SectionHeading icon={Users} label="Linha" count={fieldPlayers.length} />
                        <PlayersGrid players={fieldPlayers} onSelect={setSelectedId} />
                      </section>
                    ) : null}
                  </>
                )}
              </TabsContent>

              <TabsContent value="inactive" className="flex flex-col gap-4">
                <TeamSearchInput
                  value={queryInactive}
                  onChange={setQueryInactive}
                  placeholder="Buscar entre inativos"
                />

                {filteredInactive.length === 0 ? (
                  isFilteringInactive ? (
                    <EmptyState
                      icon={Search}
                      title={`Nada para "${queryInactive.trim()}"`}
                      description="Tente outro nome ou apelido."
                    />
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="Nenhum inativo"
                      description="Jogadores marcados como inativos aparecem aqui."
                    />
                  )
                ) : (
                  <PlayersGrid players={filteredInactive} onSelect={setSelectedId} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <PlayerDetailSheet
        targetId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
