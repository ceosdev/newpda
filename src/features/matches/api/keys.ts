export const matchKeys = {
  all: ['matches'] as const,
  list: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
  checkIns: (id: string) => [...matchKeys.all, 'detail', id, 'check-ins'] as const,
  checkInCandidates: (id: string) =>
    [...matchKeys.all, 'detail', id, 'check-in-candidates'] as const,
  scouts: (id: string) => [...matchKeys.all, 'detail', id, 'scouts'] as const,
};
