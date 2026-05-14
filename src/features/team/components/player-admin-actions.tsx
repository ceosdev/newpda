import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useChangeUserRole } from '@/features/admin/api/use-change-user-role';
import { useSetAdminFlag } from '@/features/admin/api/use-set-admin-flag';
import { useRevokeApproval } from '@/features/admin/api/use-revoke-approval';
import {
  useAdminUpdatePosition,
  type PreferredPosition,
} from '@/features/team/api/use-admin-update-position';
import {
  useAdminUpdatePlayerStatus,
  type PlayerStatus,
} from '@/features/team/api/use-admin-update-player-status';
import { POSITION_LABELS, PLAYER_STATUS_LABELS } from '@/features/team/lib/labels';
import type { ProfileRole } from '@/features/auth/types';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<ProfileRole, string> = {
  player: 'Jogador',
  spectator: 'Espectador',
};

const NO_POSITION = '__none__';
const POSITIONS: PreferredPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
const STATUSES: PlayerStatus[] = ['active', 'injured', 'inactive'];

type Confirmation =
  | { kind: 'role'; nextRole: ProfileRole }
  | { kind: 'admin'; nextValue: boolean }
  | { kind: 'revoke' }
  | null;

type PlayerAdminActionsProps = {
  targetId: string;
  displayName: string;
  isAdmin: boolean;
  isSelf: boolean;
  currentPosition: string | null;
  currentStatus: PlayerStatus;
  onClose: () => void;
};

export function PlayerAdminActions({
  targetId,
  displayName,
  isAdmin,
  isSelf,
  currentPosition,
  currentStatus,
  onClose,
}: PlayerAdminActionsProps) {
  const navigate = useNavigate();
  const changeRole = useChangeUserRole();
  const setAdmin = useSetAdminFlag();
  const revoke = useRevokeApproval();
  const updatePosition = useAdminUpdatePosition();
  const updateStatus = useAdminUpdatePlayerStatus();
  const [pending, setPending] = useState<Confirmation>(null);

  const busy =
    changeRole.isPending ||
    setAdmin.isPending ||
    revoke.isPending ||
    updatePosition.isPending ||
    updateStatus.isPending;

  const handlePositionChange = (rawValue: string) => {
    const nextPosition = rawValue === NO_POSITION ? null : (rawValue as PreferredPosition);
    const currentNormalized = (currentPosition ?? null) as PreferredPosition | null;
    if (nextPosition === currentNormalized) return;
    updatePosition.mutate(
      { targetId, position: nextPosition },
      {
        onSuccess: () => {
          toast.success(
            nextPosition
              ? `Posição de ${displayName} atualizada para ${POSITION_LABELS[nextPosition]}.`
              : `${displayName} agora está sem preferência de posição.`,
          );
        },
        onError: (error) => {
          toast.error(mapSupabaseError(error));
        },
      },
    );
  };

  const handleStatusChange = (nextStatus: PlayerStatus) => {
    if (nextStatus === currentStatus) return;
    updateStatus.mutate(
      { targetId, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(
            `Status de ${displayName} atualizado para ${PLAYER_STATUS_LABELS[nextStatus]}.`,
          );
        },
        onError: (error) => {
          toast.error(mapSupabaseError(error));
        },
      },
    );
  };

  const handleConfirm = () => {
    if (!pending) return;

    if (pending.kind === 'role') {
      const nextRole = pending.nextRole;
      changeRole.mutate(
        { targetId, newRole: nextRole },
        {
          onSuccess: () => {
            toast.success(`${displayName} virou ${ROLE_LABELS[nextRole]}.`);
            setPending(null);
            // Switching to spectator removes the player from /team — close the sheet.
            if (nextRole === 'spectator') onClose();
          },
          onError: (error) => {
            toast.error(mapSupabaseError(error));
            setPending(null);
          },
        },
      );
      return;
    }

    if (pending.kind === 'admin') {
      const nextValue = pending.nextValue;
      setAdmin.mutate(
        { targetId, value: nextValue },
        {
          onSuccess: () => {
            toast.success(
              nextValue
                ? `${displayName} virou administrador.`
                : `${displayName} deixou de ser administrador.`,
            );
            setPending(null);
            if (isSelf && !nextValue) {
              onClose();
              navigate('/', { replace: true });
            }
          },
          onError: (error) => {
            toast.error(mapSupabaseError(error));
            setPending(null);
          },
        },
      );
      return;
    }

    if (pending.kind === 'revoke') {
      revoke.mutate(
        { targetId },
        {
          onSuccess: () => {
            toast.success(`${displayName} voltou para pendente.`);
            setPending(null);
            onClose();
          },
          onError: (error) => {
            toast.error(mapSupabaseError(error));
            setPending(null);
          },
        },
      );
    }
  };

  const confirmationCopy = (() => {
    if (!pending) return null;
    if (pending.kind === 'role') {
      const becomingSpectator = pending.nextRole === 'spectator';
      return {
        title: `Trocar para ${ROLE_LABELS[pending.nextRole]}?`,
        description: becomingSpectator
          ? `${displayName} sai do cadastro ativo de jogadores (a row de players é arquivada). Histórico permanece. Pode ser revertido.`
          : `${displayName} entra para o cadastro ativo de jogadores. Pode ser revertido.`,
        confirmLabel: 'Trocar',
        destructive: false,
      };
    }
    if (pending.kind === 'admin') {
      if (pending.nextValue) {
        return {
          title: `Conceder admin a ${displayName}?`,
          description:
            'Esta pessoa passa a ver e usar todas as áreas administrativas (aprovações, gestão de time, etc.).',
          confirmLabel: 'Conceder',
          destructive: false,
        };
      }
      return {
        title: isSelf ? 'Revogar seu próprio admin?' : `Revogar admin de ${displayName}?`,
        description: isSelf
          ? 'Você perderá acesso ao painel administrativo imediatamente após confirmar.'
          : `${displayName} perde acesso ao painel administrativo. Você pode conceder de novo depois.`,
        confirmLabel: 'Revogar admin',
        destructive: true,
      };
    }
    return {
      title: `Voltar ${displayName} para pendente?`,
      description:
        'A aprovação é desfeita: o usuário cai no fluxo de aprovações pendentes e a row de players é arquivada. Pode ser re-aprovado depois, mas a ação fica registrada no histórico.',
      confirmLabel: 'Voltar a pendente',
      destructive: true,
    };
  })();

  const positionValue =
    currentPosition && (POSITIONS as string[]).includes(currentPosition)
      ? currentPosition
      : NO_POSITION;

  return (
    <>
      <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ações de admin</p>

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Posição</Label>
          <Select value={positionValue} onValueChange={handlePositionChange} disabled={busy}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Sem preferência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_POSITION}>Sem preferência</SelectItem>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {POSITION_LABELS[pos]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Status na pelada</Label>
          <RadioGroup
            value={currentStatus}
            onValueChange={(value) => handleStatusChange(value as PlayerStatus)}
            className="grid grid-cols-3 gap-2"
            disabled={busy}
          >
            {STATUSES.map((s) => (
              <div
                key={s}
                className={cn(
                  'flex items-center gap-2 rounded-md border bg-background px-3 py-2',
                  s === currentStatus && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem id={`detail-status-${targetId}-${s}`} value={s} />
                <Label
                  htmlFor={`detail-status-${targetId}-${s}`}
                  className="flex-1 cursor-pointer text-xs font-medium"
                >
                  {PLAYER_STATUS_LABELS[s]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Role</Label>
          <RadioGroup
            value="player"
            onValueChange={(value) => {
              if (value !== 'player') {
                setPending({ kind: 'role', nextRole: value as ProfileRole });
              }
            }}
            className="grid grid-cols-2 gap-2"
            disabled={busy}
          >
            {(['player', 'spectator'] as const).map((r) => (
              <div
                key={r}
                className={cn(
                  'flex items-center gap-2 rounded-md border bg-background px-3 py-2',
                  r === 'player' && 'border-primary bg-primary/5',
                )}
              >
                <RadioGroupItem id={`detail-role-${targetId}-${r}`} value={r} />
                <Label
                  htmlFor={`detail-role-${targetId}-${r}`}
                  className="flex-1 cursor-pointer text-xs font-medium"
                >
                  {ROLE_LABELS[r]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <label
          className={cn(
            'flex items-center justify-between rounded-md border bg-background px-3 py-2.5',
            busy && 'opacity-60',
          )}
        >
          <span className="flex flex-col">
            <span className="text-xs font-medium">Administrador</span>
            <span className="text-[10px] text-muted-foreground">
              {isAdmin ? 'Tem acesso completo ao painel' : 'Acesso normal'}
            </span>
          </span>
          <Switch
            checked={isAdmin}
            onCheckedChange={(value) => setPending({ kind: 'admin', nextValue: value })}
            disabled={busy}
            aria-label="Alternar admin"
          />
        </label>

        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setPending({ kind: 'revoke' })}
          disabled={busy}
        >
          {revoke.isPending && pending?.kind === 'revoke' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Voltando...
            </>
          ) : (
            'Voltar a pendente'
          )}
        </Button>
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={busy}
              className={cn(
                confirmationCopy?.destructive &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                confirmationCopy?.confirmLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
