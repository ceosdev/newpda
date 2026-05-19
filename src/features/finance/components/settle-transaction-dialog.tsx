import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useSettleTransaction } from '@/features/finance/api/use-settle-transaction';
import type { Transaction } from '@/features/finance/api/use-transactions-infinite';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn, formatBRL } from '@/lib/utils';

type Props = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettleTransactionDialog({ transaction, open, onOpenChange }: Props) {
  const settle = useSettleTransaction();

  const handleConfirm = () => {
    if (!transaction) return;
    settle.mutate(
      { id: transaction.id },
      {
        onSuccess: () => {
          toast.success('Baixa realizada.');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(mapSupabaseError(error));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && settle.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dar baixa neste lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? `O valor pago será preenchido com ${formatBRL(
                  transaction.amount_cents,
                )} e a data de pagamento com a data de hoje. O lançamento ficará como pago e não poderá mais ser editado.`
              : 'O lançamento ficará como pago.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={settle.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={settle.isPending}
            className={cn('bg-success hover:bg-success/90 text-white')}
          >
            {settle.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Baixando...
              </>
            ) : (
              'Baixar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
