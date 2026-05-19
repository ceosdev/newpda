import { type ReactNode } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatBRL } from '@/lib/utils';
import { formatDateBR } from '@/lib/date';
import { OPERATION_LABELS, STATUS_LABELS } from '@/features/finance/lib/labels';
import type { Transaction } from '@/features/finance/api/use-transactions-infinite';

type TransactionDetailSheetProps = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onSettle: (transaction: Transaction) => void;
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onDelete,
  onSettle,
}: TransactionDetailSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const title = 'Detalhe do lançamento';
  const description = transaction ? transaction.type_description : 'Lançamento financeiro.';

  const body = transaction ? (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <Row label="Data" value={formatDateBR(transaction.occurred_on)} />
        <Row label="Tipo" value={transaction.type_description} />
        <Row label="Operação" value={OPERATION_LABELS[transaction.operation]} />
        <Row
          label="Jogador"
          value={transaction.player_nickname ?? transaction.player_display_name ?? 'Sem jogador'}
        />
        <Row label="Valor" value={formatBRL(transaction.amount_cents)} />
        <Row
          label="Valor pago"
          value={
            transaction.paid_amount_cents === null ? '—' : formatBRL(transaction.paid_amount_cents)
          }
        />
        <Row
          label="Data de pagamento"
          value={transaction.paid_on ? formatDateBR(transaction.paid_on) : '—'}
        />
        <Row label="Status" value={STATUS_LABELS[transaction.status]} />
        <Row label="Observação" value={transaction.notes ?? '—'} />
        <Row
          label="Criado por"
          value={`${transaction.created_by_name} · ${formatDateBR(
            transaction.created_at.slice(0, 10),
          )}`}
        />
      </div>

      {canManage ? (
        <div className="flex flex-col gap-2">
          {transaction.status === 'open' ? (
            <Button
              type="button"
              onClick={() => onSettle(transaction)}
              className="bg-success hover:bg-success/90 w-full text-white"
            >
              <Check className="size-4" />
              Baixar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit(transaction)}
            className="w-full"
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDelete(transaction)}
            className="text-destructive hover:text-destructive w-full"
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      ) : null}
    </div>
  ) : null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[92dvh] flex-col gap-4 overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
