import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { formatBRL } from '@/lib/utils';
import { useMonthlyFeesPreview } from '@/features/finance/api/use-monthly-fees-preview';
import { useGenerateMonthlyFees } from '@/features/finance/api/use-generate-monthly-fees';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ConfirmStep = 'idle' | 'first' | 'second';

export function GenerateMonthlyFeesModal({ open, onOpenChange }: Props) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('idle');

  const preview = useMonthlyFeesPreview(month, open);
  const generate = useGenerateMonthlyFees();

  useEffect(() => {
    if (!open) return;
    setMonth(new Date().getMonth() + 1);
    setConfirmStep('idle');
  }, [open]);

  const data = preview.data;

  // Primeiro motivo de bloqueio aplicável — null quando é possível gerar.
  const blockedReason = useMemo<string | null>(() => {
    if (!data) return null;
    if (!data.typeOk) {
      return 'Não será possível gerar as mensalidades por não existir um tipo de lançamento ativo chamado «Mensalidade».';
    }
    if (data.suggestedAmountCents == null || data.suggestedAmountCents <= 0) {
      return 'O tipo de lançamento «Mensalidade» não possui valor sugerido configurado. Configure um valor antes de gerar as mensalidades.';
    }
    if (data.eligiblePlayerCount === 0) {
      return 'Não há jogadores ativos para gerar mensalidades.';
    }
    return null;
  }, [data]);

  const canGenerate =
    preview.isSuccess && blockedReason === null && data != null && !generate.isPending;

  const handleClose = (next: boolean) => {
    if (!next && generate.isPending) return;
    onOpenChange(next);
  };

  const runGenerate = () => {
    generate.mutate(month, {
      onSuccess: (result) => {
        setConfirmStep('idle');
        if (result.generated === 0) {
          toast.info('Nenhuma mensalidade gerada — todas já existiam para este mês.');
        } else {
          const head =
            result.generated === 1
              ? '1 mensalidade gerada'
              : `${result.generated} mensalidades geradas`;
          const tail = result.skipped > 0 ? ` · ${result.skipped} ignorada(s) por já existir` : '';
          toast.success(head + tail);
        }
        onOpenChange(false);
      },
      onError: (error) => {
        setConfirmStep('idle');
        toast.error(mapSupabaseError(error));
      },
    });
  };

  const handleFirstConfirm = () => {
    if (data && data.alreadyGeneratedCount >= 1) {
      setConfirmStep('second');
      return;
    }
    runGenerate();
  };

  const monthLabel = MONTHS[month - 1] ?? '';

  let body: ReactNode;
  if (preview.isLoading) {
    body = <Skeleton className="h-20 w-full" />;
  } else if (preview.isError) {
    body = (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <span>{mapSupabaseError(preview.error)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => preview.refetch()}
            disabled={preview.isFetching}
            className="self-start"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="monthly-fees-month"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Mês
          </label>
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
            <SelectTrigger id="monthly-fees-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {blockedReason ? (
          <Alert>
            <AlertDescription>{blockedReason}</AlertDescription>
          </Alert>
        ) : (
          <div className="bg-muted/30 flex flex-col gap-1 rounded-md border p-3 text-sm">
            <p>
              Competência:{' '}
              <span className="font-medium">
                {monthLabel} de {data.targetYear}
              </span>
            </p>
            <p className="text-muted-foreground text-xs">
              {data.eligiblePlayerCount}{' '}
              {data.eligiblePlayerCount === 1 ? 'jogador ativo' : 'jogadores ativos'} · valor{' '}
              {formatBRL(data.suggestedAmountCents ?? 0)} cada
            </p>
            <p className="text-muted-foreground text-xs">Goleiros não recebem mensalidade.</p>
            {data.alreadyGeneratedCount > 0 ? (
              <p className="text-warning text-xs font-medium">
                Já {data.alreadyGeneratedCount === 1 ? 'existe' : 'existem'}{' '}
                {data.alreadyGeneratedCount}{' '}
                {data.alreadyGeneratedCount === 1
                  ? 'mensalidade lançada'
                  : 'mensalidades lançadas'}{' '}
                neste mês.
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  const footer = (
    <Footer isDesktop={isDesktop}>
      <Button
        type="button"
        disabled={!canGenerate}
        onClick={() => setConfirmStep('first')}
        className="w-full sm:w-auto"
      >
        Gerar
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleClose(false)}
        className="w-full sm:w-auto"
      >
        Cancelar
      </Button>
    </Footer>
  );

  const title = 'Gerar mensalidades';
  const description =
    'Lance as mensalidades em aberto de todos os jogadores ativos do mês (exceto goleiros).';

  const content = (
    <>
      {body}
      {footer}
    </>
  );

  const confirmDialog = (
    <AlertDialog
      open={confirmStep !== 'idle'}
      onOpenChange={(next) => {
        if (!next && !generate.isPending) setConfirmStep('idle');
      }}
    >
      <AlertDialogContent>
        {confirmStep === 'second' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Mensalidades já geradas</AlertDialogTitle>
              <AlertDialogDescription>
                Você já gerou as mensalidades deste mês. Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={generate.isPending}>Cancelar</AlertDialogCancel>
              <Button type="button" onClick={runGenerate} disabled={generate.isPending}>
                {generate.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Continuar mesmo assim'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Gerar mensalidades de {monthLabel} de {data?.targetYear}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {data
                  ? `Serão lançadas ${data.eligiblePlayerCount} mensalidade(s) em aberto, no valor de ${formatBRL(
                      data.suggestedAmountCents ?? 0,
                    )} cada, uma para cada jogador ativo (goleiros não incluídos).`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={generate.isPending}>Cancelar</AlertDialogCancel>
              <Button type="button" onClick={handleFirstConfirm} disabled={generate.isPending}>
                {generate.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">{content}</div>
          </DialogContent>
        </Dialog>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="flex max-h-[92dvh] flex-col gap-4 overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">{content}</div>
        </SheetContent>
      </Sheet>
      {confirmDialog}
    </>
  );
}

function Footer({ isDesktop, children }: { isDesktop: boolean; children: ReactNode }) {
  if (isDesktop) {
    return <DialogFooter className="gap-2 sm:gap-2">{children}</DialogFooter>;
  }
  return <SheetFooter className="flex-col gap-2 px-0">{children}</SheetFooter>;
}
