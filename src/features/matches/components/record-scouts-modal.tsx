import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search, UserCheck, X } from 'lucide-react';
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
import { ScoutPlayerRow } from '@/features/matches/components/scout-player-row';
import { useMatchScouts } from '@/features/matches/api/use-match-scouts';
import { useRecordMatchScouts } from '@/features/matches/api/use-record-match-scouts';
import {
  recordScoutsSchema,
  type RecordScoutsInput,
} from '@/features/matches/schemas/match-scouts.schema';
import { useMediaQuery } from '@/hooks/use-media-query';
import { mapSupabaseError } from '@/lib/supabase/errors';

type RecordScoutsModalProps = {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function RecordScoutsModal({ matchId, open, onOpenChange }: RecordScoutsModalProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [search, setSearch] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const seededRef = useRef(false);

  const scoutsQuery = useMatchScouts(matchId);
  const record = useRecordMatchScouts();

  const { control, handleSubmit, reset, formState } = useForm<RecordScoutsInput>({
    resolver: zodResolver(recordScoutsSchema),
    defaultValues: { entries: [] },
  });
  const { fields } = useFieldArray({ control, name: 'entries' });

  const scouts = scoutsQuery.data;

  // Clear transient UI state on each opening.
  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    setSearch('');
    setSubmitError(null);
  }, [open]);

  // Seed the form once per opening, when data is available — never on later
  // background refetches, so the admin's in-progress edits are not wiped.
  useEffect(() => {
    if (!open || seededRef.current || !scouts) return;
    seededRef.current = true;
    reset({
      entries: scouts.map((s) => ({
        playerId: s.player_id,
        goals: s.goals,
        yellowCards: s.yellow_cards,
        blueCards: s.blue_cards,
        redCards: s.red_cards,
        wins: s.wins,
        draws: s.draws,
      })),
    });
  }, [open, scouts, reset]);

  const query = normalize(search);
  const hiddenFlags = useMemo(() => {
    if (!scouts) return [];
    return scouts.map((s) => {
      if (!query) return false;
      return !normalize(`${s.nickname ?? ''} ${s.display_name}`).includes(query);
    });
  }, [scouts, query]);

  const hasPlayers = (scouts?.length ?? 0) > 0;
  const noSearchMatch =
    hasPlayers && query.length > 0 && hiddenFlags.every((hidden) => hidden);

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    record.mutate(
      {
        matchId,
        entries: values.entries.map((e) => ({
          player_id: e.playerId,
          goals: e.goals,
          yellow_cards: e.yellowCards,
          blue_cards: e.blueCards,
          red_cards: e.redCards,
          wins: e.wins,
          draws: e.draws,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Scouts lançados.');
          onOpenChange(false);
        },
        onError: (error) => setSubmitError(mapSupabaseError(error)),
      },
    );
  });

  const list = (
    <div className="flex flex-col gap-2">
      {scoutsQuery.isLoading ? (
        <>
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </>
      ) : scoutsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>{mapSupabaseError(scoutsQuery.error)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoutsQuery.refetch()}
              disabled={scoutsQuery.isRefetching}
              className="self-start"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasPlayers ? (
        <EmptyState
          icon={UserCheck}
          title="Lance as presenças desta pelada antes de registrar os scouts."
        />
      ) : noSearchMatch ? (
        <EmptyState icon={Search} title="Nenhum jogador encontrado." />
      ) : (
        fields.map((field, index) => {
          const scout = scouts?.[index];
          if (!scout) return null;
          return (
            <ScoutPlayerRow
              key={field.id}
              control={control}
              index={index}
              primaryName={scout.nickname?.trim() || scout.display_name}
              avatarUrl={scout.avatar_url}
              preferredPosition={scout.preferred_position}
              hidden={hiddenFlags[index]}
            />
          );
        })
      )}
    </div>
  );

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {hasPlayers ? (
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
      ) : null}

      <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">{list}</div>

      {submitError ? (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(false)}
        disabled={record.isPending}
        className="w-full sm:w-auto"
      >
        {hasPlayers ? 'Cancelar' : 'Fechar'}
      </Button>
      {hasPlayers ? (
        <Button
          type="submit"
          disabled={!formState.isDirty || record.isPending}
          className="w-full sm:w-auto"
        >
          {record.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Lançando...
            </>
          ) : (
            'Lançar'
          )}
        </Button>
      ) : null}
    </>
  );

  const title = 'Lançar scouts';
  const description = 'Registre os números de cada jogador presente.';

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
            {body}
            <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col px-4">{body}</div>
          <SheetFooter className="flex-col gap-2 px-4">{footer}</SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
