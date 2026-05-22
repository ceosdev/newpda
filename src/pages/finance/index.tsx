import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarPlus, Loader2, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useTransactionsInfinite,
  type Transaction,
  type TransactionOperation,
  type TransactionStatus,
} from '@/features/finance/api/use-transactions-infinite';
import { TransactionFilters } from '@/features/finance/components/transaction-filters';
import { TransactionCard } from '@/features/finance/components/transaction-card';
import { TransactionFormModal } from '@/features/finance/components/transaction-form-modal';
import { GenerateMonthlyFeesModal } from '@/features/finance/components/generate-monthly-fees-modal';
import { TransactionDetailSheet } from '@/features/finance/components/transaction-detail-sheet';
import { DeleteTransactionDialog } from '@/features/finance/components/delete-transaction-dialog';
import { SettleTransactionDialog } from '@/features/finance/components/settle-transaction-dialog';
import { formatMonthLabel, monthKey } from '@/lib/date';
import { mapSupabaseError } from '@/lib/supabase/errors';
import { normalize } from '@/lib/utils';

type EditingState = { mode: 'create' } | { mode: 'edit'; transaction: Transaction } | null;

export function FinancePage() {
  const { can } = usePermissions();
  const canManage = can('manage_finance');

  const [month, setMonth] = useState<number | null>(null);
  const [operation, setOperation] = useState<TransactionOperation | null>(null);
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [nickname, setNickname] = useState('');

  const [editing, setEditing] = useState<EditingState>(null);
  const [feesOpen, setFeesOpen] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [settling, setSettling] = useState<Transaction | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactionsInfinite({ month, operation, status });

  const transactions = useMemo<Transaction[]>(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  const visible = useMemo(() => {
    const query = normalize(nickname);
    if (!query) return transactions;
    return transactions.filter((t) => {
      // Filtra pelo apelido do jogador; lançamentos sem jogador caem para o tipo.
      const haystack = t.player_id
        ? normalize(`${t.player_nickname ?? ''} ${t.player_display_name ?? ''}`)
        : normalize(t.type_description);
      return haystack.includes(query);
    });
  }, [transactions, nickname]);

  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; items: Transaction[] }[] = [];
    for (const transaction of visible) {
      const key = monthKey(transaction.occurred_on);
      const tail = groups[groups.length - 1];
      if (tail && tail.key === key) {
        tail.items.push(transaction);
      } else {
        groups.push({
          key,
          label: formatMonthLabel(transaction.occurred_on),
          items: [transaction],
        });
      }
    }
    return groups;
  }, [visible]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasFilters =
    month !== null || operation !== null || status !== null || nickname.trim() !== '';
  const clearFilters = () => {
    setMonth(null);
    setOperation(null);
    setStatus(null);
    setNickname('');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="flex-1 text-sm font-semibold tracking-tight">Financeiro</h1>
        {canManage ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setFeesOpen(true)}
              className="hidden sm:inline-flex"
            >
              <CalendarPlus className="size-4" />
              Gerar mensalidades
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setEditing({ mode: 'create' })}
              className="hidden sm:inline-flex"
            >
              <Plus className="size-4" />
              Novo lançamento
            </Button>
          </>
        ) : null}
      </header>

      <main className="flex-1 px-4 py-4 pb-24 sm:pb-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <TransactionFilters
            month={month}
            operation={operation}
            status={status}
            nickname={nickname}
            onMonthChange={setMonth}
            onOperationChange={setOperation}
            onStatusChange={setStatus}
            onNicknameChange={setNickname}
            onClear={clearFilters}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3">
                <span>{mapSupabaseError(error)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="self-start"
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : visible.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={Wallet}
                title="Nenhum lançamento encontrado"
                description="Nenhum lançamento corresponde aos filtros aplicados."
                action={
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Wallet}
                title="Nenhum lançamento registrado"
                description={
                  canManage
                    ? 'Crie o primeiro lançamento financeiro da pelada.'
                    : 'Ainda não há lançamentos financeiros.'
                }
                action={
                  canManage ? (
                    <Button type="button" onClick={() => setEditing({ mode: 'create' })}>
                      <Plus className="size-4" />
                      Novo lançamento
                    </Button>
                  ) : undefined
                }
              />
            )
          ) : (
            <>
              <div className="flex flex-col gap-5">
                {groupedByMonth.map((group) => (
                  <section key={group.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                        {group.label}
                      </h2>
                      <div aria-hidden className="bg-border h-px flex-1" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.items.map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          canManage={canManage}
                          onSelect={setDetail}
                          onSettle={setSettling}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div ref={sentinelRef} aria-hidden className="h-1" />

              {isFetchingNextPage ? (
                <div className="flex justify-center py-2">
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm"
                  >
                    <Loader2 aria-hidden className="text-primary size-3.5 animate-spin" />
                    <span>Carregando mais lançamentos</span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      {canManage ? (
        <>
          <Button
            type="button"
            variant="secondary"
            aria-label="Gerar mensalidades"
            onClick={() => setFeesOpen(true)}
            className="fixed right-4 bottom-20 size-12 rounded-full shadow-lg sm:hidden"
          >
            <CalendarPlus className="size-5" />
          </Button>
          <Button
            type="button"
            aria-label="Novo lançamento"
            onClick={() => setEditing({ mode: 'create' })}
            className="fixed right-4 bottom-4 size-12 rounded-full shadow-lg sm:hidden"
          >
            <Plus className="size-5" />
          </Button>
        </>
      ) : null}

      <GenerateMonthlyFeesModal open={feesOpen} onOpenChange={setFeesOpen} />

      <TransactionFormModal
        {...(editing?.mode === 'edit'
          ? { mode: 'edit' as const, transaction: editing.transaction }
          : { mode: 'create' as const })}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />

      <TransactionDetailSheet
        transaction={detail}
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        canManage={canManage}
        onEdit={(transaction) => {
          setDetail(null);
          setEditing({ mode: 'edit', transaction });
        }}
        onDelete={(transaction) => {
          setDetail(null);
          setDeleting(transaction);
        }}
        onSettle={(transaction) => {
          setDetail(null);
          setSettling(transaction);
        }}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />

      <SettleTransactionDialog
        transaction={settling}
        open={settling !== null}
        onOpenChange={(open) => {
          if (!open) setSettling(null);
        }}
      />
    </div>
  );
}
