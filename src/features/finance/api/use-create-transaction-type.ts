import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionTypeKeys } from '@/features/finance/api/keys';

type Input = {
  description: string;
  suggestedAmountCents: number | null;
  isActive: boolean;
};

export function useCreateTransactionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ description, suggestedAmountCents, isActive }: Input) => {
      const { data, error } = await supabase.rpc('create_transaction_type', {
        p_description: description,
        // null -> undefined so the RPC's `default null` applies (no value).
        p_suggested_amount_cents: suggestedAmountCents ?? undefined,
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
