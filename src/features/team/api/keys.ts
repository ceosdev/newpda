export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  detail: (id: string | null) => [...teamKeys.all, 'detail', id] as const,
};
