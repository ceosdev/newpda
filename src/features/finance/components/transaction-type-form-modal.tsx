import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { CurrencyInput } from '@/components/shared/currency-input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { isNotFoundError, mapSupabaseError } from '@/lib/supabase/errors';
import { useCreateTransactionType } from '@/features/finance/api/use-create-transaction-type';
import { useUpdateTransactionType } from '@/features/finance/api/use-update-transaction-type';
import type { TransactionType } from '@/features/finance/api/use-transaction-types';
import {
  transactionTypeSchema,
  type TransactionTypeInput,
} from '@/features/finance/schemas/transaction-type.schema';

type CreateMode = { mode: 'create' };
type EditMode = { mode: 'edit'; transactionType: TransactionType };

type TransactionTypeFormModalProps = (CreateMode | EditMode) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function defaultsFor(props: CreateMode | EditMode): TransactionTypeInput {
  if (props.mode === 'edit') {
    return {
      description: props.transactionType.description,
      suggestedAmountCents: props.transactionType.suggested_amount_cents,
      isActive: props.transactionType.is_active,
    };
  }
  return { description: '', suggestedAmountCents: null, isActive: true };
}

export function TransactionTypeFormModal(props: TransactionTypeFormModalProps) {
  const { open, onOpenChange } = props;
  const isEdit = props.mode === 'edit';
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const create = useCreateTransactionType();
  const update = useUpdateTransactionType();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<TransactionTypeInput>({
    resolver: zodResolver(transactionTypeSchema),
    defaultValues: defaultsFor(props),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultsFor(props));
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, isEdit ? props.transactionType.id : null]);

  const handleClose = (next: boolean) => {
    if (!next) setSubmitError(null);
    onOpenChange(next);
  };

  const handleError = (error: unknown) => {
    // The type vanished (another admin deleted it): the list invalidation from
    // the mutation refreshes the screen — just report and close.
    if (isNotFoundError(error)) {
      toast.error(mapSupabaseError(error));
      handleClose(false);
      return;
    }
    setSubmitError(mapSupabaseError(error));
  };

  const onSubmit = (values: TransactionTypeInput) => {
    setSubmitError(null);

    if (props.mode === 'edit') {
      update.mutate(
        { id: props.transactionType.id, ...values },
        {
          onSuccess: () => {
            toast.success('Tipo de lançamento atualizado.');
            handleClose(false);
          },
          onError: handleError,
        },
      );
      return;
    }

    create.mutate(values, {
      onSuccess: () => {
        toast.success('Tipo de lançamento criado.');
        handleClose(false);
      },
      onError: handleError,
    });
  };

  const busy = create.isPending || update.isPending;
  const title = isEdit ? 'Editar tipo de lançamento' : 'Novo tipo de lançamento';
  const description = isEdit
    ? 'Atualize a descrição, o valor sugerido ou o status.'
    : 'Cadastre um tipo para usar no módulo financeiro.';

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Mensalidade" autoFocus maxLength={80} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="suggestedAmountCents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor sugerido (opcional)</FormLabel>
              <FormControl>
                <CurrencyInput
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  placeholder="Sem valor sugerido"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <FormLabel className="cursor-pointer">Ativo</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Tipo de lançamento ativo"
                />
              </FormControl>
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
