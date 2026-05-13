import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { adminKeys } from '@/features/admin/api/keys';
import { teamKeys } from '@/features/team/api/keys';
import type { ProfileRole } from '@/features/auth/types';

type ChangeUserRoleInput = {
  targetId: string;
  newRole: ProfileRole;
};

export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, newRole }: ChangeUserRoleInput) => {
      const { data, error } = await supabase.rpc('change_user_role', {
        p_target: targetId,
        p_new_role: newRole,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
