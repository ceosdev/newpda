import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionTypeKeys } from '@/features/finance/api/keys';

type Input = {
  id: string;
  description: string;
  suggestedAmountCents: number | null;
  isActive: boolean;
};

export function useUpdateTransactionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, description, suggestedAmountCents, isActive }: Input) => {
      const { data, error } = await supabase.rpc('update_transaction_type', {
        p_id: id,
        p_description: description,
        // The RPC accepts null (clears the suggested value), but the generated
        // types don't mark nullable RPC params — hence the cast.
        p_suggested_amount_cents: suggestedAmountCents as number,
        p_is_active: isActive,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionTypeKeys.all });
    },
  });
}
