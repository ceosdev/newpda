import { ArrowLeft, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import { usePendingProfiles } from '@/features/admin/api/use-pending-profiles';
import { PendingProfileCard } from '@/features/admin/components/pending-profile-card';
import { mapSupabaseError } from '@/lib/supabase/errors';

export function ApprovalsPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = usePendingProfiles();
  const total = data?.length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight">Aprovações</h1>
          {!isLoading && !isError ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {total === 0
                ? 'nenhuma pendência'
                : total === 1
                  ? '1 aguardando'
                  : `${total} aguardando`}
            </p>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
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
          ) : total === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhum usuário pendente"
              description="Quando alguém se cadastrar, aparece aqui para aprovação."
            />
          ) : (
            data?.map((profile) => (
              <PendingProfileCard key={profile.id} profile={profile} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
