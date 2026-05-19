import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';

type Input = { id: string };

/**
 * "Baixar" um lançamento: marca como pago integralmente (valor pago = valor,
 * data de pagamento = hoje) sem abrir o formulário de edição.
 */
export function useSettleTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: Input) => {
      const { data, error } = await supabase.rpc('settle_transaction', { p_id: id });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
