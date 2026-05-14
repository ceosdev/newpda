import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlayerDetail } from '@/features/team/api/use-player-detail';
import { positionLabel, playerStatusLabel } from '@/features/team/lib/labels';
import { PlayerAdminActions } from '@/features/team/components/player-admin-actions';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useSession } from '@/features/auth/api/use-session';
import { mapSupabaseError } from '@/lib/supabase/errors';

type PlayerDetailSheetProps = {
  targetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-right font-medium">{value}</span>
    </div>
  );
}

export function PlayerDetailSheet({ targetId, open, onOpenChange }: PlayerDetailSheetProps) {
  const { isAdmin } = usePermissions();
  const { data: session } = useSession();
  const currentUserId = session?.user.id ?? null;
  const { data: player, isLoading, isError, error } = usePlayerDetail(targetId);

  const isSelf = Boolean(targetId && currentUserId && targetId === currentUserId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[92dvh] flex-col gap-4 overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Jogador</SheetTitle>
          <SheetDescription>Detalhes completos do membro da pelada.</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>{mapSupabaseError(error)}</AlertDescription>
          </Alert>
        ) : !player ? (
          <Alert>
            <AlertDescription>Jogador não encontrado.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center gap-4 px-1">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-medium text-primary">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.display_name}
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span aria-hidden>{initialsOf(player.display_name)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">
                  {player.nickname?.trim() || player.display_name}
                </p>
                {player.nickname?.trim() ? (
                  <p className="truncate text-xs text-muted-foreground">{player.display_name}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-1">
                  {player.is_admin ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Admin
                    </span>
                  ) : null}
                  {isSelf ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Você
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col divide-y rounded-md border bg-card px-3">
              <InfoRow label="Email" value={player.email} />
              <InfoRow label="Celular" value={player.phone ?? '—'} />
              <InfoRow label="Nascimento" value={formatDate(player.birth_date)} />
              <InfoRow label="Posição" value={positionLabel(player.preferred_position)} />
              <InfoRow label="Status" value={playerStatusLabel(player.player_status)} />
              <InfoRow label="Membro desde" value={formatDate(player.member_since)} />
            </div>

            {isAdmin && targetId ? (
              <PlayerAdminActions
                targetId={targetId}
                displayName={player.display_name}
                isAdmin={player.is_admin}
                isSelf={isSelf}
                currentPosition={player.preferred_position}
                currentStatus={player.player_status}
                onClose={() => onOpenChange(false)}
              />
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
