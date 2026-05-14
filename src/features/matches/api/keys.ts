export const matchKeys = {
  all: ['matches'] as const,
  list: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
};
