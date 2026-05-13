import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import { useCurrentPlayer } from '@/features/me/api/use-current-player';
import { ProfileForm } from '@/features/me/components/profile-form';
import { mapSupabaseError } from '@/lib/supabase/errors';

export function MePage() {
  const profileQuery = useCurrentProfile();
  const playerQuery = useCurrentPlayer();
  const profile = profileQuery.data;
  const isPlayer = profile?.role === 'player';

  const playerLoading = isPlayer && playerQuery.isLoading;
  const ready = profile && (!isPlayer || playerQuery.isSuccess);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-semibold tracking-tight">Meu cadastro</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {profileQuery.isLoading || playerLoading ? (
            <Skeleton className="h-[28rem] w-full" />
          ) : profileQuery.isError || !profile ? (
            <Alert variant="destructive">
              <AlertDescription>{mapSupabaseError(profileQuery.error)}</AlertDescription>
            </Alert>
          ) : isPlayer && playerQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{mapSupabaseError(playerQuery.error)}</AlertDescription>
            </Alert>
          ) : ready ? (
            <ProfileForm profile={profile} player={playerQuery.data ?? null} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
