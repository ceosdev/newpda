import { Card } from '@/components/ui/card';
import { positionLabel } from '@/features/team/lib/labels';
import { cn } from '@/lib/utils';
import type { MatchAttendance } from '@/features/matches/api/use-match-attendances';

type Props = {
  entry: MatchAttendance;
  isSelf: boolean;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function AttendancePlayerCard({ entry, isSelf }: Props) {
  const primaryName = entry.nickname?.trim() || entry.display_name;
  return (
    <Card className={cn('flex items-center gap-3 p-3', isSelf && 'border-primary/40')}>
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-medium text-primary">
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={primaryName}
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <span aria-hidden>{initialsOf(primaryName)}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium leading-tight">{primaryName}</p>
        <p className="text-[11px] text-muted-foreground">
          {positionLabel(entry.preferred_position)}
          {isSelf ? <span className="ml-2 text-primary">· Você</span> : null}
        </p>
      </div>
    </Card>
  );
}
