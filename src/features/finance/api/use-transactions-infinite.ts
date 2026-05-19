import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { transactionKeys } from '@/features/finance/api/keys';
import type { Database } from '@/lib/supabase/database.types';

export type TransactionOperation = Database['public']['Enums']['transaction_operation'];
export type TransactionStatus = Database['public']['Enums']['transaction_status'];

// list_transactions returns several columns that are nullable at runtime
// (player joins, payment fields, notes) but the generated types mark them
// non-null — we narrow to the correct shape here, at the boundary.
export type Transaction = {
  id: string;
  occurred_on: string;
  transaction_type_id: string;
  type_description: string;
  player_id: string | null;
  player_nickname: string | null;
  player_display_name: string | null;
  operation: TransactionOperation;
  amount_cents: number;
  paid_amount_cents: number | null;
  paid_on: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  created_by: string;
  created_by_name: string;
};

export type TransactionFilters = {
  /** Month of the year (1-12), or null for all months. */
  month: number | null;
  operation: TransactionOperation | null;
  status: TransactionStatus | null;
};

export const TRANSACTIONS_PAGE_SIZE = 20;

async function fetchTransactionsPage(
  pageIndex: number,
  filters: TransactionFilters,
): Promise<Transaction[]> {
  const { data, error } = await supabase.rpc('list_transactions', {
    p_limit: TRANSACTIONS_PAGE_SIZE,
    p_offset: pageIndex * TRANSACTIONS_PAGE_SIZE,
    p_month: filters.month ?? undefined,
    p_operation: filters.operation ?? undefined,
    p_status: filters.status ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export function useTransactionsInfinite(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam }) => fetchTransactionsPage(pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < TRANSACTIONS_PAGE_SIZE) return undefined;
      return allPages.length;
    },
    staleTime: 10_000,
  });
}
