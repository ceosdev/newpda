import { LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/features/auth/api/use-sign-out';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { usePendingProfiles } from '@/features/admin/api/use-pending-profiles';

export function HomePage() {
  const signOut = useSignOut();
  const { data: profile } = useCurrentProfile();
  const { isAdmin, can } = usePermissions();
  const canManageApprovals = can('manage_approvals');
  const { data: pending } = usePendingProfiles({ enabled: canManageApprovals });
  const pendingCount = pending?.length ?? 0;
  const hasPending = pendingCount > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <span className="text-sm font-medium tracking-tight">newpda</span>
        </div>
        <div className="flex items-center gap-1">
          {canManageApprovals ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={
                hasPending
                  ? `Aprovações (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})`
                  : 'Aprovações'
              }
              className="relative"
            >
              <Link to="/admin/approvals">
                <ShieldCheck className="size-4" />
                {hasPending ? (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
                  />
                ) : null}
              </Link>
            </Button>
          ) : null}
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight">{profile?.display_name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {isAdmin ? 'Admin' : profile?.role === 'player' ? 'Jogador' : 'Espectador'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Bem-vindo{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerenciador da pelada — em desenvolvimento.
            </p>
          </div>
          <Button size="lg" disabled>
            Pronto pra primeira partida
          </Button>
        </div>
      </main>
    </div>
  );
}
