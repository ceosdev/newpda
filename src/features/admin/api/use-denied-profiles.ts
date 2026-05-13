import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';

export type DeniedProfile = {
  id: string;
  email: string;
  display_name: string;
  denied_reason: string | null;
  updated_at: string;
};

async function fetchDeniedProfiles(): Promise<DeniedProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, denied_reason, updated_at')
    .eq('status', 'denied')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

type UseDeniedProfilesOptions = {
  enabled?: boolean;
};

export function useDeniedProfiles({ enabled = true }: UseDeniedProfilesOptions = {}) {
  return useQuery({
    queryKey: adminKeys.deniedProfiles(),
    queryFn: fetchDeniedProfiles,
    staleTime: 10_000,
    enabled,
  });
}
