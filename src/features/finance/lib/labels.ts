import type {
  TransactionOperation,
  TransactionStatus,
} from '@/features/finance/api/use-transactions-infinite';

export const OPERATION_LABELS: Record<TransactionOperation, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  open: 'Aberto',
  partial: 'Parcial',
  paid: 'Pago',
};
