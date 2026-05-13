import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { authKeys } from '@/features/auth/api/keys';

type UpdateMyProfileInput = {
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  birthDate?: string | null;
};

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      displayName,
      avatarUrl = null,
      phone = null,
      birthDate = null,
    }: UpdateMyProfileInput) => {
      const { data, error } = await supabase.rpc('update_my_profile', {
        p_display_name: displayName,
        p_avatar_url: avatarUrl ?? undefined,
        p_phone: phone ?? undefined,
        p_birth_date: birthDate ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
