import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import { useTeamPlayers } from '@/features/team/api/use-team-players';
import { PlayerListCard } from '@/features/team/components/player-list-card';
import { PlayerDetailSheet } from '@/features/team/components/player-detail-sheet';
import { mapSupabaseError } from '@/lib/supabase/errors';

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function TeamPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useTeamPlayers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    if (!q) return data;
    return data.filter((p) => {
      const haystack = normalize(`${p.nickname ?? ''} ${p.display_name}`);
      return haystack.includes(q);
    });
  }, [data, query]);

  const total = data?.length ?? 0;
  const filteredCount = filtered.length;
  const isFiltering = query.trim().length > 0;

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
              {isFiltering
                ? `${filteredCount} de ${total}`
                : total === 1
                  ? '1 jogador'
                  : `${total} jogadores`}
            </p>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          {!isLoading && !isError && total > 0 ? (
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por apelido ou nome"
                aria-label="Buscar jogador"
                className="pl-9 pr-9"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ) : null}

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
          ) : total === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum jogador ainda"
              description="Quando alguém for aprovado como jogador, aparece aqui."
            />
          ) : filteredCount === 0 ? (
            <EmptyState
              icon={Search}
              title={`Nenhum jogador para "${query.trim()}"`}
              description="Tente outro nome ou apelido."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((player) => (
                <PlayerListCard
                  key={player.profile_id}
                  player={player}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
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
