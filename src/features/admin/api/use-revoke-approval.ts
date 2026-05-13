import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';

type RevokeApprovalInput = {
  targetId: string;
};

export function useRevokeApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId }: RevokeApprovalInput) => {
      const { data, error } = await supabase.rpc('revoke_approval', {
        p_target: targetId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
