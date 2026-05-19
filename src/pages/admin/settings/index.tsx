import { useState } from 'react';
import { ArrowLeft, Plus, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeading } from '@/components/shared/section-heading';
import {
  useTransactionTypes,
  type TransactionType,
} from '@/features/finance/api/use-transaction-types';
import { TransactionTypeList } from '@/features/finance/components/transaction-type-list';
import { TransactionTypeFormModal } from '@/features/finance/components/transaction-type-form-modal';
import { DeleteTransactionTypeDialog } from '@/features/finance/components/delete-transaction-type-dialog';
import { mapSupabaseError } from '@/lib/supabase/errors';

type EditingState = { mode: 'create' } | { mode: 'edit'; type: TransactionType } | null;

export function SettingsPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useTransactionTypes();
  const [editing, setEditing] = useState<EditingState>(null);
  const [deleting, setDeleting] = useState<TransactionType | null>(null);

  const types = data ?? [];
  const hasTypes = types.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-semibold tracking-tight">Configurações</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <section className="flex flex-col gap-3">
            <SectionHeading
              icon={Tags}
              label="Tipos de lançamento"
              count={!isLoading && !isError ? types.length : undefined}
              action={
                <Button type="button" size="sm" onClick={() => setEditing({ mode: 'create' })}>
                  <Plus className="size-4" />
                  Novo tipo
                </Button>
              }
            />

            {isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
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
            ) : !hasTypes ? (
              <EmptyState
                icon={Tags}
                title="Nenhum tipo de lançamento cadastrado"
                description="Crie o primeiro para preparar o financeiro."
                action={
                  <Button type="button" onClick={() => setEditing({ mode: 'create' })}>
                    <Plus className="size-4" />
                    Novo tipo
                  </Button>
                }
              />
            ) : (
              <TransactionTypeList
                types={types}
                onEdit={(type) => setEditing({ mode: 'edit', type })}
                onDelete={setDeleting}
              />
            )}
          </section>
        </div>
      </main>

      <TransactionTypeFormModal
        {...(editing?.mode === 'edit'
          ? { mode: 'edit' as const, transactionType: editing.type }
          : { mode: 'create' as const })}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />

      <DeleteTransactionTypeDialog
        transactionType={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}
