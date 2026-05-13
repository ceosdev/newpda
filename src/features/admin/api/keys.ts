export const adminKeys = {
  all: ['admin'] as const,
  pendingProfiles: () => [...adminKeys.all, 'pending'] as const,
  deniedProfiles: () => [...adminKeys.all, 'denied'] as const,
};
