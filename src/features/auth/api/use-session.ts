import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { authKeys } from '@/features/auth/api/keys';

async function fetchSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function useSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(authKeys.session(), session);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    });
    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: fetchSession,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
