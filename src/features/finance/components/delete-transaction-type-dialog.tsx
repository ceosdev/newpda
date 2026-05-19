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
import { useDeleteTransactionType } from '@/features/finance/api/use-delete-transaction-type';
import type { TransactionType } from '@/features/finance/api/use-transaction-types';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type Props = {
  transactionType: TransactionType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTransactionTypeDialog({ transactionType, open, onOpenChange }: Props) {
  const del = useDeleteTransactionType();

  const handleConfirm = () => {
    if (!transactionType) return;
    del.mutate(
      { id: transactionType.id },
      {
        onSuccess: () => {
          toast.success('Tipo de lançamento excluído.');
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
          <AlertDialogTitle>Excluir tipo de lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {transactionType
              ? `O tipo «${transactionType.description}» será removido. Esta ação não pode ser desfeita.`
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
