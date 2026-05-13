import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';

type DenyUserInput = {
  targetId: string;
  reason: string;
};

export function useDenyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, reason }: DenyUserInput) => {
      const { data, error } = await supabase.rpc('deny_user', {
        p_target: targetId,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingProfiles() });
    },
  });
}
