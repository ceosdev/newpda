export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: (userId: string | null) => [...authKeys.all, 'profile', userId] as const,
};
