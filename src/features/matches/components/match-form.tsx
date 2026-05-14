import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateMatch } from '@/features/matches/api/use-create-match';
import { useUpdateMatchSchedule } from '@/features/matches/api/use-update-match-schedule';
import {
  matchScheduleSchema,
  type MatchScheduleInput,
} from '@/features/matches/schemas/match.schema';
import {
  DEFAULT_MATCH_TIME,
  MATCH_STATUS_LABELS,
  formatMatchTime,
  todayLocalIso,
  type MatchStatus,
} from '@/features/matches/lib/labels';
import { useMediaQuery } from '@/hooks/use-media-query';
import { mapSupabaseError } from '@/lib/supabase/errors';

type CreateMode = { mode: 'create' };
type EditMode = {
  mode: 'edit';
  matchId: string;
  matchDate: string;
  matchTime: string;
  status: MatchStatus;
};

type MatchFormProps = (CreateMode | EditMode) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MatchForm(props: MatchFormProps) {
  const { open, onOpenChange } = props;
  const isEdit = props.mode === 'edit';
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const create = useCreateMatch();
  const update = useUpdateMatchSchedule();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<MatchScheduleInput>({
    resolver: zodResolver(matchScheduleSchema),
    defaultValues: {
      matchDate: isEdit ? props.matchDate : todayLocalIso(),
      matchTime: isEdit ? formatMatchTime(props.matchTime) : DEFAULT_MATCH_TIME,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      matchDate: isEdit ? props.matchDate : todayLocalIso(),
      matchTime: isEdit ? formatMatchTime(props.matchTime) : DEFAULT_MATCH_TIME,
    });
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, isEdit ? props.matchId : null]);

  const handleClose = (next: boolean) => {
    if (!next) setSubmitError(null);
    onOpenChange(next);
  };

  const onSubmit = (values: MatchScheduleInput) => {
    setSubmitError(null);

    if (isEdit) {
      update.mutate(
        { matchId: props.matchId, matchDate: values.matchDate, matchTime: values.matchTime },
        {
          onSuccess: () => {
            toast.success('Pelada atualizada.');
            handleClose(false);
          },
          onError: (error) => setSubmitError(mapSupabaseError(error)),
        },
      );
      return;
    }

    create.mutate(
      { matchDate: values.matchDate, matchTime: values.matchTime },
      {
        onSuccess: () => {
          toast.success('Pelada criada.');
          handleClose(false);
        },
        onError: (error) => setSubmitError(mapSupabaseError(error)),
      },
    );
  };

  const busy = create.isPending || update.isPending;

  const title = isEdit ? 'Editar pelada' : 'Nova pelada';
  const description = isEdit
    ? 'Atualize a data ou a hora. O status é gerenciado pelas ações de fechar.'
    : 'Defina quando essa pelada vai acontecer. Status começa como Aberta.';

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="matchDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="matchTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isEdit ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{MATCH_STATUS_LABELS[props.status]}</span>
          </div>
        ) : null}

        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <FormFooter isDesktop={isDesktop}>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isEdit ? 'Salvando...' : 'Criando...'}
              </>
            ) : isEdit ? (
              'Salvar'
            ) : (
              'Criar pelada'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </FormFooter>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4">{formBody}</div>
      </SheetContent>
    </Sheet>
  );
}

function FormFooter({ isDesktop, children }: { isDesktop: boolean; children: ReactNode }) {
  if (isDesktop) {
    return <DialogFooter className="gap-2 sm:gap-2">{children}</DialogFooter>;
  }
  return <SheetFooter className="flex-col gap-2 px-0">{children}</SheetFooter>;
}
