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
import { useDeleteTransaction } from '@/features/finance/api/use-delete-transaction';
import type { Transaction } from '@/features/finance/api/use-transactions-infinite';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type Props = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTransactionDialog({ transaction, open, onOpenChange }: Props) {
  const del = useDeleteTransaction();

  const handleConfirm = () => {
    if (!transaction) return;
    del.mutate(
      { id: transaction.id },
      {
        onSuccess: () => {
          toast.success('Lançamento excluído.');
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
        if (!next && del.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? `O lançamento «${transaction.type_description}» será removido. Esta ação não pode ser desfeita.`
              : 'Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={del.isPending}
            className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {del.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
