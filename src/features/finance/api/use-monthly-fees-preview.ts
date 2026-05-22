import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { monthlyFeesKeys } from '@/features/finance/api/keys';

export type MonthlyFeesPreview = {
  /** Year the fees would land on (current year, or next on the December rollover). */
  targetYear: number;
  /** An active transaction type named "Mensalidade" exists. */
  typeOk: boolean;
  /** Suggested amount of that type, in cents — null when unset. */
  suggestedAmountCents: number | null;
  /** Monthly players (active/injured, not archived) that would receive a fee. */
  eligiblePlayerCount: number;
  /** Mensalidades already launched for the target month/year. */
  alreadyGeneratedCount: number;
};

/**
 * Read-only preview that lets the modal pick the right blocking message and
 * confirmation before generating. Year is derived server-side.
 */
export function useMonthlyFeesPreview(month: number, enabled: boolean) {
  return useQuery({
    queryKey: monthlyFeesKeys.preview(month),
    queryFn: async (): Promise<MonthlyFeesPreview> => {
      const { data, error } = await supabase.rpc('preview_monthly_fees', { p_month: month });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('Não foi possível carregar a prévia das mensalidades.');
      return {
        targetYear: row.target_year,
        typeOk: row.type_ok,
        suggestedAmountCents: row.suggested_amount_cents ?? null,
        eligiblePlayerCount: row.eligible_player_count,
        alreadyGeneratedCount: row.already_generated_count,
      };
    },
    enabled,
    staleTime: 0,
  });
}
