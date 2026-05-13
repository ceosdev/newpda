import { ArrowLeft, Ban, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { usePendingProfiles } from '@/features/admin/api/use-pending-profiles';
import { useDeniedProfiles } from '@/features/admin/api/use-denied-profiles';
import { PendingProfileCard } from '@/features/admin/components/pending-profile-card';
import { DeniedProfileCard } from '@/features/admin/components/denied-profile-card';
import { mapSupabaseError } from '@/lib/supabase/errors';

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

function ErrorBlock({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying: boolean }) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-col gap-3">
        <span>{mapSupabaseError(error)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="self-start"
        >
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ApprovalsPage() {
  const pending = usePendingProfiles();
  const denied = useDeniedProfiles();

  const pendingCount = pending.data?.length ?? 0;
  const deniedCount = denied.data?.length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-semibold tracking-tight">Aprovações</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <Tabs defaultValue="pending" className="flex flex-col gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pendentes
                {pending.isSuccess && pendingCount > 0 ? (
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {pendingCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="denied">
                Negados
                {denied.isSuccess && deniedCount > 0 ? (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {deniedCount}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="flex flex-col gap-3">
              {pending.isLoading ? (
                <LoadingSkeleton />
              ) : pending.isError ? (
                <ErrorBlock error={pending.error} onRetry={pending.refetch} retrying={pending.isRefetching} />
              ) : pendingCount === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Nenhum usuário pendente"
                  description="Quando alguém se cadastrar, aparece aqui para aprovação."
                />
              ) : (
                pending.data?.map((profile) => (
                  <PendingProfileCard key={profile.id} profile={profile} />
                ))
              )}
            </TabsContent>

            <TabsContent value="denied" className="flex flex-col gap-3">
              {denied.isLoading ? (
                <LoadingSkeleton />
              ) : denied.isError ? (
                <ErrorBlock error={denied.error} onRetry={denied.refetch} retrying={denied.isRefetching} />
              ) : deniedCount === 0 ? (
                <EmptyState
                  icon={Ban}
                  title="Nenhum usuário negado"
                  description="Reconsiderações aparecem aqui caso você negue alguém por engano."
                />
              ) : (
                denied.data?.map((profile) => (
                  <DeniedProfileCard key={profile.id} profile={profile} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
