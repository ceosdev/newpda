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
import { useDeleteMatch } from '@/features/matches/api/use-delete-match';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

type Props = {
  matchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteMatchDialog({ matchId, open, onOpenChange }: Props) {
  const del = useDeleteMatch();

  const handleConfirm = () => {
    if (!matchId) return;
    del.mutate(
      { matchId },
      {
        onSuccess: () => {
          toast.success('Pelada excluída.');
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
        if (!next && del.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta pelada?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente. Todos os lançamentos já feitos nesta pelada (presença, etc.)
            serão apagados junto.
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
