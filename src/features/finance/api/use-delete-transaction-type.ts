import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionTypeKeys } from '@/features/finance/api/keys';

type Input = { id: string };

export function useDeleteTransactionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: Input) => {
      const { error } = await supabase.rpc('delete_transaction_type', { p_id: id });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionTypeKeys.all });
    },
  });
}
