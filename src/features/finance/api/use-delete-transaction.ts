import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';

type Input = { id: string };

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: Input) => {
      const { error } = await supabase.rpc('delete_transaction', { p_id: id });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
