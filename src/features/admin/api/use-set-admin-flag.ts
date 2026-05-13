import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';
import { teamKeys } from '@/features/team/api/keys';
import { authKeys } from '@/features/auth/api/keys';

type SetAdminFlagInput = {
  targetId: string;
  value: boolean;
};

export function useSetAdminFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, value }: SetAdminFlagInput) => {
      const { data, error } = await supabase.rpc('set_admin_flag', {
        p_target: targetId,
        p_value: value,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      // Self-edit may invalidate the current user's profile (lose/gain admin).
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
