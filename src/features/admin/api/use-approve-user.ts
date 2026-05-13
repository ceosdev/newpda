import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';
import type { ProfileRole } from '@/features/auth/types';

type ApproveUserInput = {
  targetId: string;
  role: ProfileRole;
};

export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, role }: ApproveUserInput) => {
      const { data, error } = await supabase.rpc('approve_user', {
        p_target: targetId,
        p_role: role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingProfiles() });
    },
  });
}
