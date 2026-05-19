import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  TransactionOperation,
  TransactionStatus,
} from '@/features/finance/api/use-transactions-infinite';

const ALL = 'all';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type TransactionFiltersProps = {
  month: number | null;
  operation: TransactionOperation | null;
  status: TransactionStatus | null;
  nickname: string;
  onMonthChange: (value: number | null) => void;
  onOperationChange: (value: TransactionOperation | null) => void;
  onStatusChange: (value: TransactionStatus | null) => void;
  onNicknameChange: (value: string) => void;
  onClear: () => void;
};

export function TransactionFilters({
  month,
  operation,
  status,
  nickname,
  onMonthChange,
  onOperationChange,
  onStatusChange,
  onNicknameChange,
  onClear,
}: TransactionFiltersProps) {
  const hasFilters =
    month !== null || operation !== null || status !== null || nickname.trim() !== '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-month"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Mês
          </label>
          <Select
            value={month === null ? ALL : String(month)}
            onValueChange={(value) => onMonthChange(value === ALL ? null : Number(value))}
          >
            <SelectTrigger id="filter-month" className="h-9 w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-operation"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Operação
          </label>
          <Select
            value={operation ?? ALL}
            onValueChange={(value) =>
              onOperationChange(value === ALL ? null : (value as TransactionOperation))
            }
          >
            <SelectTrigger id="filter-operation" className="h-9 w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-status"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Status
          </label>
          <Select
            value={status ?? ALL}
            onValueChange={(value) =>
              onStatusChange(value === ALL ? null : (value as TransactionStatus))
            }
          >
            <SelectTrigger id="filter-status" className="h-9 w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
          >
            <X className="size-3" />
            Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="relative">
        <Search
          aria-hidden
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          inputMode="search"
          placeholder="Filtrar por apelido do jogador"
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
