import { Card } from '@/components/ui/card';
import { positionLabel, playerStatusLabel } from '@/features/team/lib/labels';
import type { PlayerListItem } from '@/features/team/api/use-team-players';
import { cn } from '@/lib/utils';

type PlayerListCardProps = {
  player: PlayerListItem;
  onSelect: (id: string) => void;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inactive: 'bg-muted text-muted-foreground',
  injured: 'bg-destructive/10 text-destructive',
};

type StatSlot = { label: string; value: string };

const PLACEHOLDER_STATS: StatSlot[] = [
  { label: 'Gols', value: '—' },
  { label: 'Cartões', value: '—' },
  { label: 'Frequência', value: '—' },
];

export function PlayerListCard({ player, onSelect }: PlayerListCardProps) {
  const primaryName = player.nickname?.trim() || player.display_name;
  const statusKey = player.player_status ?? 'active';

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(player.profile_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(player.profile_id);
        }
      }}
      className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex gap-3 p-3">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-2xl font-semibold text-primary">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={primaryName}
              className="size-full object-cover"
              draggable={false}
            />
          ) : (
            <span aria-hidden>{initialsOf(primaryName)}</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-base font-semibold leading-tight">
              {primaryName}
            </p>
            <span
              className={cn(
                'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                STATUS_BADGE_CLASS[statusKey] ?? STATUS_BADGE_CLASS.active,
              )}
            >
              {playerStatusLabel(player.player_status)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {positionLabel(player.preferred_position)}
          </p>

          {player.is_admin ? (
            <span className="mt-auto w-fit rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              Admin
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t bg-muted/30 px-3 py-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          {PLACEHOLDER_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground/80">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
