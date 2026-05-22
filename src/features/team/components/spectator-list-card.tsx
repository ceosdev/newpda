import { Card } from '@/components/ui/card';
import type { SpectatorListItem } from '@/features/team/api/use-team-spectators';

type SpectatorListCardProps = {
  spectator: SpectatorListItem;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function SpectatorListCard({ spectator }: SpectatorListCardProps) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold">
        {spectator.avatar_url ? (
          <img
            src={spectator.avatar_url}
            alt={spectator.display_name}
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <span aria-hidden>{initialsOf(spectator.display_name)}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">
          {spectator.display_name}
        </p>
        {spectator.is_admin ? (
          <span className="text-primary bg-primary/10 w-fit rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Admin
          </span>
        ) : null}
      </div>
    </Card>
  );
}
