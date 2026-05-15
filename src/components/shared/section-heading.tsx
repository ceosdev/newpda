import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

type SectionHeadingProps = {
  icon: LucideIcon;
  label: string;
  count?: number;
  /** trailing slot pushed to the right — e.g. a section-level action button */
  action?: ReactNode;
};

/**
 * Discreet uppercase section heading. Shared across screens that split content
 * into labelled sections (the team roster, the match detail page).
 */
export function SectionHeading({ icon: Icon, label, count, action }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon aria-hidden className="size-3.5 text-muted-foreground" />
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      {count !== undefined ? (
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{count}</span>
      ) : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
