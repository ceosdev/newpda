import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { authKeys } from '@/features/auth/api/keys';
import { useSession } from '@/features/auth/api/use-session';
import type { Profile } from '@/features/auth/types';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, avatar_url, phone, birth_date, status, role, is_admin, theme_preference, approved_at, approved_by, denied_reason, onboarded_at, created_at, updated_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useCurrentProfile() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 2,
  });

  return {
    ...query,
    isLoading: sessionLoading || query.isLoading,
    userId,
  };
}
