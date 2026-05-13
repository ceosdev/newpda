import { useMemo } from 'react';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import type { Capability, Profile } from '@/features/auth/types';

function computeCapabilities(profile: Profile | null | undefined): Set<Capability> {
  const caps = new Set<Capability>();
  if (!profile) return caps;
  if (profile.status !== 'approved' || profile.role === null) return caps;

  caps.add('access_app');
  caps.add('edit_self_profile');

  if (profile.is_admin) {
    caps.add('manage_approvals');
    caps.add('manage_players');
    caps.add('manage_matches');
    caps.add('manage_admins');
  }

  return caps;
}

export function usePermissions() {
  const { data: profile } = useCurrentProfile();

  return useMemo(() => {
    const caps = computeCapabilities(profile);
    return {
      profile: profile ?? null,
      can: (capability: Capability) => caps.has(capability),
      isAdmin: profile?.is_admin === true,
      isApprovedPlayer:
        profile?.status === 'approved' && profile?.role === 'player',
    };
  }, [profile]);
}
