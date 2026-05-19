export const transactionTypeKeys = {
  all: ['finance', 'transaction-types'] as const,
  list: () => [...transactionTypeKeys.all, 'list'] as const,
};
