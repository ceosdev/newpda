import { CalendarDays, Clock, Pencil, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MATCH_STATUS_BADGE_CLASS,
  MATCH_STATUS_LABELS,
  formatMatchDate,
  formatMatchTime,
} from '@/features/matches/lib/labels';
import type { Match } from '@/features/matches/api/use-matches-infinite';
import { cn } from '@/lib/utils';

type MatchCardProps = {
  match: Match;
  canManage: boolean;
  canRespond: boolean;
  onEdit: (match: Match) => void;
  onClose: (matchId: string) => void;
  onDelete: (matchId: string) => void;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

const ATTENDANCE_PLACEHOLDER_TOAST =
  'Respostas de presença ficam habilitadas na próxima entrega.';

export function MatchCard({
  match,
  canManage,
  canRespond,
  onEdit,
  onClose,
  onDelete,
}: MatchCardProps) {
  const isOpen = match.status === 'open';

  const showResponse = canRespond && isOpen;
  const showCloseAction = canManage && isOpen;

  const handlePlaceholder = () => {
    toast.info(ATTENDANCE_PLACEHOLDER_TOAST, { duration: 2200 });
  };

  return (
    <Card className="overflow-hidden">
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
        <div className="grid grid-cols-3 gap-2 px-4 pt-4">
          <Button
            type="button"
            onClick={handlePlaceholder}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Eu vou
          </Button>
          <Button type="button" variant="destructive" onClick={handlePlaceholder}>
            Não vou
          </Button>
          <Button
            type="button"
            onClick={handlePlaceholder}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Talvez
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-4">
        <StatCell label="Confirmados" value="0" />
        <StatCell label="Pendentes" value="0" />
        <StatCell label="Não vão" value="0" />
      </div>

      {canManage ? (
        <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2">
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
              <XCircle aria-hidden className="size-4" />
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
