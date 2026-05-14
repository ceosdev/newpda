import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { authKeys } from '@/features/auth/api/keys';

type Input = { value: 'light' | 'dark' };

export function useUpdateThemePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ value }: Input) => {
      const { data, error } = await supabase.rpc('update_my_theme_preference', {
        p_value: value,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
