import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyInput } from '@/components/shared/currency-input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { isNotFoundError, mapSupabaseError } from '@/lib/supabase/errors';
import { formatBRL } from '@/lib/utils';
import { todayLocalIso } from '@/lib/date';
import { useTransactionTypes } from '@/features/finance/api/use-transaction-types';
import { usePlayerOptions } from '@/features/finance/api/use-player-options';
import { useCreateTransaction } from '@/features/finance/api/use-create-transaction';
import { useUpdateTransaction } from '@/features/finance/api/use-update-transaction';
import type { Transaction } from '@/features/finance/api/use-transactions-infinite';
import {
  transactionSchema,
  type TransactionInput,
} from '@/features/finance/schemas/transaction.schema';

const PLAYER_NONE = '__none__';

type CreateMode = { mode: 'create' };
type EditMode = { mode: 'edit'; transaction: Transaction };

type TransactionFormModalProps = (CreateMode | EditMode) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function defaultsFor(props: CreateMode | EditMode): DefaultValues<TransactionInput> {
  if (props.mode === 'edit') {
    const t = props.transaction;
    return {
      occurredOn: t.occurred_on,
      transactionTypeId: t.transaction_type_id,
      operation: t.operation,
      amountCents: t.amount_cents,
      playerId: t.player_id,
      paidAmountCents: t.paid_amount_cents,
      paidOn: t.paid_on,
      notes: t.notes ?? '',
    };
  }
  return {
    occurredOn: todayLocalIso(),
    transactionTypeId: undefined,
    operation: undefined,
    amountCents: undefined,
    playerId: null,
    paidAmountCents: null,
    paidOn: null,
    notes: '',
  };
}

export function TransactionFormModal(props: TransactionFormModalProps) {
  const { open, onOpenChange } = props;
  const isEdit = props.mode === 'edit';
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const { data: types } = useTransactionTypes();
  const { data: players } = usePlayerOptions();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingPrefill, setPendingPrefill] = useState<{ amount: number; label: string } | null>(
    null,
  );

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaultsFor(props),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultsFor(props));
    setSubmitError(null);
    setPendingPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, isEdit ? props.transaction.id : null]);

  const typeOptions = useMemo(() => {
    const active = (types ?? [])
      .filter((t) => t.is_active)
      .map((t) => ({ id: t.id, label: t.description, suggested: t.suggested_amount_cents }));
    if (props.mode === 'edit') {
      const t = props.transaction;
      if (!active.some((o) => o.id === t.transaction_type_id)) {
        active.unshift({ id: t.transaction_type_id, label: t.type_description, suggested: null });
      }
    }
    return active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, isEdit, isEdit ? props.transaction.id : null]);

  const playerOptions = useMemo(() => {
    const list = (players ?? []).map((p) => ({ id: p.id, label: p.nickname ?? p.display_name }));
    if (props.mode === 'edit' && props.transaction.player_id) {
      const t = props.transaction;
      if (!list.some((o) => o.id === t.player_id)) {
        list.unshift({
          id: t.player_id as string,
          label: t.player_nickname ?? t.player_display_name ?? 'Jogador',
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, isEdit, isEdit ? props.transaction.id : null]);

  const noTypes = !isEdit && typeOptions.length === 0;

  const handleClose = (next: boolean) => {
    if (!next) setSubmitError(null);
    onOpenChange(next);
  };

  const handleTypeChange = (typeId: string) => {
    form.setValue('transactionTypeId', typeId, { shouldDirty: true, shouldValidate: true });
    const option = typeOptions.find((o) => o.id === typeId);
    const suggested = option?.suggested ?? null;
    if (suggested === null) return;
    const current = form.getValues('amountCents');
    if (current == null) {
      form.setValue('amountCents', suggested, { shouldDirty: true, shouldValidate: true });
    } else if (current !== suggested) {
      setPendingPrefill({ amount: suggested, label: option?.label ?? '' });
    }
  };

  const handleError = (error: unknown) => {
    if (isNotFoundError(error)) {
      toast.error(mapSupabaseError(error));
      handleClose(false);
      return;
    }
    setSubmitError(mapSupabaseError(error));
  };

  const onSubmit = (values: TransactionInput) => {
    setSubmitError(null);
    // Valor pago 0 ou vazio = sem pagamento (lançamento aberto): zera o par.
    const hasPayment = values.paidAmountCents !== null && values.paidAmountCents > 0;
    const payload = {
      occurredOn: values.occurredOn,
      transactionTypeId: values.transactionTypeId,
      operation: values.operation,
      amountCents: values.amountCents,
      playerId: values.playerId,
      paidAmountCents: hasPayment ? values.paidAmountCents : null,
      paidOn: hasPayment ? values.paidOn : null,
      notes: values.notes.trim() ? values.notes.trim() : null,
    };

    if (props.mode === 'edit') {
      update.mutate(
        { id: props.transaction.id, ...payload },
        {
          onSuccess: () => {
            toast.success('Lançamento atualizado.');
            handleClose(false);
          },
          onError: handleError,
        },
      );
      return;
    }

    create.mutate(payload, {
      onSuccess: () => {
        toast.success('Lançamento criado.');
        handleClose(false);
      },
      onError: handleError,
    });
  };

  const busy = create.isPending || update.isPending;
  const title = isEdit ? 'Editar lançamento' : 'Novo lançamento';
  const description = isEdit
    ? 'Atualize os dados do lançamento.'
    : 'Registre uma movimentação financeira.';

  const amountWatch = form.watch('amountCents');
  const paidWatch = form.watch('paidAmountCents');
  // Valor pago 0 ou vazio = aberto; só > 0 conta como pagamento.
  const statusPreview =
    amountWatch == null
      ? null
      : paidWatch == null || paidWatch === 0
        ? 'Aberto'
        : paidWatch >= amountWatch
          ? 'Pago'
          : 'Parcial';

  let body: ReactNode;
  if (noTypes) {
    body = (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Cadastre um tipo de lançamento em{' '}
            <Link to="/admin/settings" className="font-medium underline underline-offset-2">
              Configurações
            </Link>{' '}
            antes de criar um lançamento.
          </AlertDescription>
        </Alert>
        <FormFooter isDesktop={isDesktop}>
          <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
            Fechar
          </Button>
        </FormFooter>
      </div>
    );
  } else {
    body = (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="occurredOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do lançamento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operação</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="- Selecione -" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={handleTypeChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="- Selecione -" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amountCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      placeholder="R$ 0,00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="playerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jogador (opcional)</FormLabel>
                  <Select
                    value={field.value ?? PLAYER_NONE}
                    onValueChange={(value) => field.onChange(value === PLAYER_NONE ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PLAYER_NONE}>Sem jogador</SelectItem>
                      {playerOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-muted/30 rounded-md border p-3">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
              Pagamento (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="paidAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor pago</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        placeholder="Sem pagamento"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de pagamento</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {statusPreview ? (
              <p className="text-muted-foreground mt-3 text-xs">
                Este lançamento ficará como:{' '}
                <span className="text-foreground font-medium">{statusPreview}</span>
              </p>
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação (opcional)</FormLabel>
                <FormControl>
                  <Textarea rows={3} maxLength={500} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <FormFooter isDesktop={isDesktop}>
            <Button
              type="submit"
              disabled={busy || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
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
  }

  const prefillDialog = (
    <AlertDialog
      open={pendingPrefill !== null}
      onOpenChange={(next) => {
        if (!next) setPendingPrefill(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Substituir o valor?</AlertDialogTitle>
          <AlertDialogDescription>
            O valor atual será substituído pelo valor sugerido de «{pendingPrefill?.label}» (
            {pendingPrefill ? formatBRL(pendingPrefill.amount) : ''}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter valor atual</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingPrefill) {
                form.setValue('amountCents', pendingPrefill.amount, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
              setPendingPrefill(null);
            }}
          >
            Substituir
          </AlertDialogAction>
        </AlertDialogFooter>
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
            {body}
          </DialogContent>
        </Dialog>
        {prefillDialog}
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
          <div className="px-4 pb-4">{body}</div>
        </SheetContent>
      </Sheet>
      {prefillDialog}
    </>
  );
}

function FormFooter({ isDesktop, children }: { isDesktop: boolean; children: ReactNode }) {
  if (isDesktop) {
    return <DialogFooter className="gap-2 sm:gap-2">{children}</DialogFooter>;
  }
  return <SheetFooter className="flex-col gap-2 px-0">{children}</SheetFooter>;
}
