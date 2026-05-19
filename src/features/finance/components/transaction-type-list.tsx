import { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TransactionType } from '@/features/finance/api/use-transaction-types';
import { cn, formatBRL } from '@/lib/utils';

type TransactionTypeListProps = {
  types: TransactionType[];
  onEdit: (type: TransactionType) => void;
  onDelete: (type: TransactionType) => void;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Active types first, then alphabetical (accent-insensitive) within each group. */
function sortTypes(types: TransactionType[]): TransactionType[] {
  return [...types].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return normalize(a.description).localeCompare(normalize(b.description), 'pt-BR');
  });
}

export function TransactionTypeList({ types, onEdit, onDelete }: TransactionTypeListProps) {
  const sorted = useMemo(() => sortTypes(types), [types]);

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((type) => (
        <li key={type.id}>
          <TransactionTypeCard type={type} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}

function TransactionTypeCard({
  type,
  onEdit,
  onDelete,
}: {
  type: TransactionType;
  onEdit: (type: TransactionType) => void;
  onDelete: (type: TransactionType) => void;
}) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{type.description}</p>
        <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {type.suggested_amount_cents === null ? '—' : formatBRL(type.suggested_amount_cents)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <StatusBadge isActive={type.is_active} />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Editar ${type.description}`}
            onClick={() => onEdit(type)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Excluir ${type.description}`}
            onClick={() => onDelete(type)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        isActive ? 'text-success' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', isActive ? 'bg-success' : 'bg-muted-foreground/40')}
      />
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}
