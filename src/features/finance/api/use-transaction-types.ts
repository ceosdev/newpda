import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionTypeKeys } from '@/features/finance/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type TransactionType = Database['public']['Tables']['transaction_types']['Row'];

async function fetchTransactionTypes(): Promise<TransactionType[]> {
  const { data, error } = await supabase
    .from('transaction_types')
    .select('id, description, suggested_amount_cents, is_active, created_at, updated_at');
  if (error) throw error;
  return data ?? [];
}

export function useTransactionTypes() {
  return useQuery({
    queryKey: transactionTypeKeys.list(),
    queryFn: fetchTransactionTypes,
    staleTime: 10_000,
  });
}
