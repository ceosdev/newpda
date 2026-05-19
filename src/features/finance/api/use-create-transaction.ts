import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';
import type { TransactionOperation } from '@/features/finance/api/use-transactions-infinite';

export type TransactionMutationInput = {
  occurredOn: string;
  transactionTypeId: string;
  operation: TransactionOperation;
  amountCents: number;
  playerId: string | null;
  paidAmountCents: number | null;
  paidOn: string | null;
  notes: string | null;
};

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionMutationInput) => {
      const { data, error } = await supabase.rpc('create_transaction', {
        p_occurred_on: input.occurredOn,
        p_transaction_type_id: input.transactionTypeId,
        p_operation: input.operation,
        p_amount_cents: input.amountCents,
        // null -> undefined so the RPC's `default null` applies.
        p_player_id: input.playerId ?? undefined,
        p_paid_amount_cents: input.paidAmountCents ?? undefined,
        p_paid_on: input.paidOn ?? undefined,
        p_notes: input.notes ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
