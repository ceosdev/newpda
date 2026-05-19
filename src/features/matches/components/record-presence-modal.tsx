import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmptyState } from '@/components/shared/empty-state';
import { PlayerMiniCard } from '@/features/matches/components/player-mini-card';
import {
  useMatchCheckInCandidates,
  type CheckInCandidate,
} from '@/features/matches/api/use-match-check-in-candidates';
import { useRecordMatchCheckIns } from '@/features/matches/api/use-record-match-check-ins';
import { positionLabel } from '@/features/team/lib/labels';
import { useMediaQuery } from '@/hooks/use-media-query';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn, normalize } from '@/lib/utils';

type RecordPresenceModalProps = {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CandidateRow({
  candidate,
  selected,
  onToggle,
}: {
  candidate: CheckInCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  const primaryName = candidate.nickname?.trim() || candidate.display_name;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PlayerMiniCard
        avatarUrl={candidate.avatar_url}
        primaryName={primaryName}
        secondary={positionLabel(candidate.preferred_position)}
        selected={selected}
        trailing={
          <span
            aria-hidden
            className={cn(
              'flex size-5 items-center justify-center rounded-md border transition-colors',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
            )}
          >
            {selected ? <Check className="size-3.5" /> : null}
          </span>
        }
      />
    </button>
  );
}

export function RecordPresenceModal({ matchId, open, onOpenChange }: RecordPresenceModalProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const candidatesQuery = useMatchCheckInCandidates(matchId, open);
  const record = useRecordMatchCheckIns();

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch('');
    setSubmitError(null);
  }, [open]);

  const candidatesData = candidatesQuery.data;
  const candidates = useMemo(() => candidatesData ?? [], [candidatesData]);
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return candidates;
    return candidates.filter((c) =>
      normalize(`${c.nickname ?? ''} ${c.display_name}`).includes(q),
    );
  }, [candidates, search]);

  const toggle = (playerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleClose = (next: boolean) => {
    if (!next) setSubmitError(null);
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    setSubmitError(null);
    record.mutate(
      { matchId, playerIds: [...selected] },
      {
        onSuccess: () => {
          toast.success('Presenças lançadas.');
          handleClose(false);
        },
        onError: (error) => setSubmitError(mapSupabaseError(error)),
      },
    );
  };

  const selectionLabel =
    selected.size === 0
      ? 'Nenhum selecionado'
      : selected.size === 1
        ? '1 selecionado'
        : `${selected.size} selecionados`;

  const list = (
    <div className="flex flex-col gap-2">
      {candidatesQuery.isLoading ? (
        <>
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </>
      ) : candidatesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>{mapSupabaseError(candidatesQuery.error)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => candidatesQuery.refetch()}
              disabled={candidatesQuery.isRefetching}
              className="self-start"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : candidates.length === 0 ? (
        <EmptyState icon={UserCheck} title="Todos os jogadores ativos já foram lançados." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum jogador encontrado." />
      ) : (
        filtered.map((candidate) => (
          <CandidateRow
            key={candidate.player_id}
            candidate={candidate}
            selected={selected.has(candidate.player_id)}
            onToggle={() => toggle(candidate.player_id)}
          />
        ))
      )}
    </div>
  );

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador"
          aria-label="Buscar jogador"
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="-mx-1 max-h-[50vh] overflow-y-auto px-1">{list}</div>

      {submitError ? (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  const footer = (
    <>
      <span className="text-xs tabular-nums text-muted-foreground sm:mr-auto sm:self-center">
        {selectionLabel}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleClose(false)}
        disabled={record.isPending}
        className="w-full sm:w-auto"
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size === 0 || record.isPending}
        className="w-full sm:w-auto"
      >
        {record.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Lançando...
          </>
        ) : (
          'Confirmar'
        )}
      </Button>
    </>
  );

  const title = 'Lançar presença';
  const description = 'Marque quem esteve presente nesta pelada.';

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4">{body}</div>
        <SheetFooter className="flex-col gap-2 px-4">{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
