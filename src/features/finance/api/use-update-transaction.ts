import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';
import type { TransactionMutationInput } from '@/features/finance/api/use-create-transaction';

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionMutationInput & { id: string }) => {
      const { data, error } = await supabase.rpc('update_transaction', {
        p_id: id,
        p_occurred_on: input.occurredOn,
        p_transaction_type_id: input.transactionTypeId,
        p_operation: input.operation,
        p_amount_cents: input.amountCents,
        // The RPC accepts null in these args, but the generated types don't
        // mark nullable RPC params — hence the casts.
        p_player_id: input.playerId as string,
        p_paid_amount_cents: input.paidAmountCents as number,
        p_paid_on: input.paidOn as string,
        p_notes: input.notes as string,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
