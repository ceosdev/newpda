import type { TransactionFilters } from '@/features/finance/api/use-transactions-infinite';

export const transactionTypeKeys = {
  all: ['finance', 'transaction-types'] as const,
  list: () => [...transactionTypeKeys.all, 'list'] as const,
};

export const transactionKeys = {
  all: ['finance', 'transactions'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.all, 'list', filters] as const,
};

export const playerOptionKeys = {
  all: ['finance', 'player-options'] as const,
};

export const monthlyFeesKeys = {
  all: ['finance', 'monthly-fees'] as const,
  preview: (month: number) => [...monthlyFeesKeys.all, 'preview', month] as const,
};
