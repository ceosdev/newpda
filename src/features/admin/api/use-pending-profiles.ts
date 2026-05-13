import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';

export type PendingProfile = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

async function fetchPendingProfiles(): Promise<PendingProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function usePendingProfiles() {
  return useQuery({
    queryKey: adminKeys.pendingProfiles(),
    queryFn: fetchPendingProfiles,
    staleTime: 10_000,
  });
}
