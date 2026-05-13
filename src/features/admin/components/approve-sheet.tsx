import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApproveUser } from '@/features/admin/api/use-approve-user';
import type { PendingProfile } from '@/features/admin/api/use-pending-profiles';
import type { ProfileRole } from '@/features/auth/types';
import { mapSupabaseError } from '@/lib/supabase/errors';

type ApproveSheetProps = {
  profile: PendingProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLE_LABELS: Record<ProfileRole, string> = {
  player: 'Jogador',
  spectator: 'Espectador',
};

export function ApproveSheet({ profile, open, onOpenChange }: ApproveSheetProps) {
  const [role, setRole] = useState<ProfileRole>('player');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const approve = useApproveUser();

  const handleConfirm = () => {
    setSubmitError(null);
    approve.mutate(
      { targetId: profile.id, role },
      {
        onSuccess: () => {
          toast.success(`${profile.display_name} aprovado(a) como ${ROLE_LABELS[role].toLowerCase()}.`);
          onOpenChange(false);
        },
        onError: (error) => setSubmitError(mapSupabaseError(error)),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>Aprovar {profile.display_name}</SheetTitle>
          <SheetDescription>Como o quê este usuário entra na pelada?</SheetDescription>
        </SheetHeader>

        <RadioGroup
          value={role}
          onValueChange={(value) => setRole(value as ProfileRole)}
          className="px-4"
        >
          <div className="flex items-center gap-3 rounded-md border px-3 py-3">
            <RadioGroupItem id={`role-player-${profile.id}`} value="player" />
            <Label htmlFor={`role-player-${profile.id}`} className="flex-1 cursor-pointer">
              <span className="block text-sm font-medium">Jogador</span>
              <span className="block text-xs text-muted-foreground">
                Participa de partidas, confirma presença.
              </span>
            </Label>
          </div>
          <div className="flex items-center gap-3 rounded-md border px-3 py-3">
            <RadioGroupItem id={`role-spectator-${profile.id}`} value="spectator" />
            <Label htmlFor={`role-spectator-${profile.id}`} className="flex-1 cursor-pointer">
              <span className="block text-sm font-medium">Espectador</span>
              <span className="block text-xs text-muted-foreground">
                Acesso de leitura, não joga.
              </span>
            </Label>
          </div>
        </RadioGroup>

        {submitError ? (
          <Alert variant="destructive" className="mx-4">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <SheetFooter className="flex-col gap-2">
          <Button onClick={handleConfirm} disabled={approve.isPending} className="w-full">
            {approve.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Aprovando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={approve.isPending}
            className="w-full"
          >
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
