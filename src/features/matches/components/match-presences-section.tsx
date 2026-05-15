import { useState } from 'react';
import { Loader2, Plus, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeading } from '@/components/shared/section-heading';
import { PlayerMiniCard } from '@/features/matches/components/player-mini-card';
import { RecordPresenceModal } from '@/features/matches/components/record-presence-modal';
import {
  useMatchCheckIns,
  type MatchCheckIn,
} from '@/features/matches/api/use-match-check-ins';
import { useRemoveMatchCheckIn } from '@/features/matches/api/use-remove-match-check-in';
import { positionLabel } from '@/features/team/lib/labels';
import { mapSupabaseError } from '@/lib/supabase/errors';

type MatchPresencesSectionProps = {
  matchId: string;
  /** whether the viewer can launch/remove presences (admin) */
  canManage: boolean;
};

function PresenceCard({
  entry,
  canManage,
  removing,
  onRemove,
}: {
  entry: MatchCheckIn;
  canManage: boolean;
  removing: boolean;
  onRemove: (name: string) => void;
}) {
  const primaryName = entry.nickname?.trim() || entry.display_name;
  return (
    <PlayerMiniCard
      avatarUrl={entry.avatar_url}
      primaryName={primaryName}
      secondary={positionLabel(entry.preferred_position)}
      trailing={
        canManage ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-destructive"
            aria-label={`Remover ${primaryName} das presenças`}
            onClick={() => onRemove(primaryName)}
            disabled={removing}
          >
            {removing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
          </Button>
        ) : undefined
      }
    />
  );
}

export function MatchPresencesSection({ matchId, canManage }: MatchPresencesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch, isRefetching } = useMatchCheckIns(matchId);
  const remove = useRemoveMatchCheckIn();

  const checkIns = data ?? [];
  const count = isLoading || isError ? undefined : checkIns.length;

  const handleRemove = (playerId: string, name: string) => {
    setRemovingId(playerId);
    remove.mutate(
      { matchId, playerId },
      {
        onSuccess: () => toast.success(`${name} removido das presenças.`),
        onError: (err) => toast.error(mapSupabaseError(err)),
        onSettled: () => setRemovingId(null),
      },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        icon={UserCheck}
        label="Presenças"
        count={count}
        action={
          canManage ? (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Lançar presença
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>{mapSupabaseError(error)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="self-start"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : checkIns.length === 0 ? (
        <EmptyState icon={UserCheck} title="Nenhuma presença lançada ainda." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checkIns.map((entry) => (
            <PresenceCard
              key={entry.player_id}
              entry={entry}
              canManage={canManage}
              removing={removingId === entry.player_id}
              onRemove={(name) => handleRemove(entry.player_id, name)}
            />
          ))}
        </div>
      )}

      {canManage ? (
        <RecordPresenceModal matchId={matchId} open={modalOpen} onOpenChange={setModalOpen} />
      ) : null}
    </section>
  );
}
