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
import { useCloseMatch } from '@/features/matches/api/use-close-match';
import { mapSupabaseError } from '@/lib/supabase/errors';

type Props = {
  matchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CloseMatchDialog({ matchId, open, onOpenChange }: Props) {
  const close = useCloseMatch();

  const handleConfirm = () => {
    if (!matchId) return;
    close.mutate(
      { matchId },
      {
        onSuccess: () => {
          toast.success('Pelada fechada.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(mapSupabaseError(error)),
      },
    );
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && close.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Fechar esta pelada?</AlertDialogTitle>
          <AlertDialogDescription>
            Uma vez fechada, a pelada não aceita mais respostas dos jogadores e não pode ser
            reaberta. As ações de presença saem do card.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={close.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={close.isPending}>
            {close.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Fechando...
              </>
            ) : (
              'Fechar pelada'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
