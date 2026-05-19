import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatBRL } from '@/lib/utils';
import { formatDayMonth } from '@/lib/date';
import { OPERATION_LABELS, STATUS_LABELS } from '@/features/finance/lib/labels';
import type {
  Transaction,
  TransactionStatus,
} from '@/features/finance/api/use-transactions-infinite';

const STATUS_DOT: Record<TransactionStatus, string> = {
  open: 'bg-muted-foreground/40',
  partial: 'bg-warning',
  paid: 'bg-success',
};

const STATUS_TEXT: Record<TransactionStatus, string> = {
  open: 'text-muted-foreground',
  partial: 'text-warning',
  paid: 'text-success',
};

type TransactionCardProps = {
  transaction: Transaction;
  canManage: boolean;
  onSelect: (transaction: Transaction) => void;
  onSettle: (transaction: Transaction) => void;
};

export function TransactionCard({
  transaction,
  canManage,
  onSelect,
  onSettle,
}: TransactionCardProps) {
  const isIncome = transaction.operation === 'income';
  const playerLabel =
    transaction.player_nickname ?? transaction.player_display_name ?? 'Sem jogador';
  const amountTone = isIncome ? 'text-success' : 'text-destructive';
  const canSettle = canManage && transaction.status === 'open';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(transaction)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
          event.preventDefault();
          onSelect(transaction);
        }
      }}
      className="hover:bg-muted/40 focus-visible:ring-ring cursor-pointer rounded-lg border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {transaction.type_description}
        </p>
        <span className={cn('shrink-0 text-xs font-medium', amountTone)}>
          {OPERATION_LABELS[transaction.operation]}
        </span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {playerLabel} · {formatDayMonth(transaction.occurred_on)}
        </p>
        <span className={cn('shrink-0 text-sm font-semibold tabular-nums', amountTone)}>
          {isIncome ? '+' : '−'} {formatBRL(transaction.amount_cents)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            STATUS_TEXT[transaction.status],
          )}
        >
          <span
            aria-hidden
            className={cn('size-1.5 rounded-full', STATUS_DOT[transaction.status])}
          />
          {STATUS_LABELS[transaction.status]}
        </span>
        {canSettle ? (
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onSettle(transaction);
            }}
            className="bg-success hover:bg-success/90 h-7 px-2.5 text-xs text-white"
          >
            <Check className="size-3.5" />
            Baixar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
