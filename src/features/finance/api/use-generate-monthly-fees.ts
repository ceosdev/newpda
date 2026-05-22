import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';

export type GenerateMonthlyFeesResult = {
  /** Fees actually created. */
  generated: number;
  /** Eligible players skipped because they already had a fee for the month. */
  skipped: number;
};

/**
 * Gera as mensalidades em aberto do mês escolhido — uma por jogador mensalista
 * ativo, de forma atômica, pulando quem já possui mensalidade no mês/ano.
 */
export function useGenerateMonthlyFees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (month: number): Promise<GenerateMonthlyFeesResult> => {
      const { data, error } = await supabase.rpc('generate_monthly_fees', { p_month: month });
      if (error) throw error;
      const row = data?.[0];
      return { generated: row?.generated ?? 0, skipped: row?.skipped ?? 0 };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
