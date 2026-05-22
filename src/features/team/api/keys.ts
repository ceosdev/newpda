export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  spectators: () => [...teamKeys.all, 'spectators'] as const,
  detail: (id: string | null) => [...teamKeys.all, 'detail', id] as const,
};
