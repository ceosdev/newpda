export const meKeys = {
  all: ['me'] as const,
  player: () => [...meKeys.all, 'player'] as const,
};
