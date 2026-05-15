import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

type PlayerMiniCardProps = {
  avatarUrl: string | null;
  /** nickname || display_name, already resolved */
  primaryName: string;
  /** position label, already translated to PT */
  secondary: string;
  /** discreet "· Você" marker after the secondary line */
  isSelf?: boolean;
  /** visual highlight when picked (used by the launch modal) */
  selected?: boolean;
  /** trailing slot — remove button, selection indicator, etc. */
  trailing?: ReactNode;
  className?: string;
};

/**
 * Lean player card (avatar + name + position) reused across the match detail
 * sections (responses tab, presences list) and the launch modal. Purely
 * presentational — interaction lives in the wrapping element.
 */
export function PlayerMiniCard({
  avatarUrl,
  primaryName,
  secondary,
  isSelf = false,
  selected = false,
  trailing,
  className,
}: PlayerMiniCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-row items-center gap-2.5 p-2.5 transition-colors',
        isSelf && 'border-primary/40',
        selected && 'border-primary bg-primary/5',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium text-primary">
        {avatarUrl ? (
          <img
            src={avatarUrl}
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
        <p className="truncate text-[11px] text-muted-foreground">
          {secondary}
          {isSelf ? <span className="ml-2 text-primary">· Você</span> : null}
        </p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Card>
  );
}
