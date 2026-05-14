import { CalendarDays, Clock, Lock, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MATCH_STATUS_BADGE_CLASS,
  MATCH_STATUS_LABELS,
  formatMatchDate,
  formatMatchTime,
  type AttendanceResponse,
} from '@/features/matches/lib/labels';
import type { MatchWithCounts } from '@/features/matches/api/use-matches-infinite';
import { AttendanceControls } from '@/features/matches/components/attendance-controls';
import { cn } from '@/lib/utils';

type MatchCardProps = {
  match: MatchWithCounts;
  canManage: boolean;
  canRespond: boolean;
  myResponse: AttendanceResponse | null;
  onNavigate: (matchId: string) => void;
  onEdit: (match: MatchWithCounts) => void;
  onClose: (matchId: string) => void;
  onDelete: (matchId: string) => void;
};

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

export function MatchCard({
  match,
  canManage,
  canRespond,
  myResponse,
  onNavigate,
  onEdit,
  onClose,
  onDelete,
}: MatchCardProps) {
  const isOpen = match.status === 'open';
  const showResponse = canRespond && isOpen;
  const showCloseAction = canManage && isOpen;

  const handleNavigate = () => onNavigate(match.id);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            {formatMatchDate(match.match_date)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            <Clock aria-hidden className="size-4" />
            {formatMatchTime(match.match_time)}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            MATCH_STATUS_BADGE_CLASS[match.status],
          )}
        >
          {MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>

      {showResponse ? (
        <div className="px-4 pt-3">
          <AttendanceControls matchId={match.id} currentResponse={myResponse} />
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-4">
        <StatCell label="Confirmados" value={match.going_count} />
        <StatCell label="Não vão" value={match.declined_count} />
        <StatCell label="Talvez" value={match.maybe_count} />
      </div>

      {canManage ? (
        <div
          className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2"
          onClick={stop}
          onKeyDown={stop}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(match)}
          >
            <Pencil aria-hidden className="size-4" />
            Editar
          </Button>
          {showCloseAction ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onClose(match.id)}
            >
              <Lock aria-hidden className="size-4" />
              Fechar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(match.id)}
          >
            <Trash2 aria-hidden className="size-4" />
            Excluir
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
