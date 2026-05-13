import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/auth-card';
import { useSignOut } from '@/features/auth/api/use-sign-out';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';

export function PendingApprovalPage() {
  const signOut = useSignOut();
  const { data: profile } = useCurrentProfile();

  return (
    <AuthCard title="Aguardando aprovação">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <Clock className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          {profile?.display_name ? `Olá, ${profile.display_name}. ` : ''}
          Sua conta foi criada e está aguardando aprovação de um administrador da pelada.
          Você receberá acesso assim que for liberado.
        </p>
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
