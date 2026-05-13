import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/auth-card';
import { useSignOut } from '@/features/auth/api/use-sign-out';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';

export function AccessDeniedPage() {
  const signOut = useSignOut();
  const { data: profile } = useCurrentProfile();

  return (
    <AuthCard title="Acesso negado">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          Sua conta não foi aprovada para acessar a pelada.
        </p>
        {profile?.denied_reason ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium">Motivo:</span> {profile.denied_reason}
          </p>
        ) : null}
        <Button
          variant="outline"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="w-full"
        >
          {signOut.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saindo...
            </>
          ) : (
            'Sair'
          )}
        </Button>
      </div>
    </AuthCard>
  );
}
