import { CalendarDays, LogOut, Settings, ShieldCheck, User, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useSignOut } from '@/features/auth/api/use-sign-out';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { usePendingProfiles } from '@/features/admin/api/use-pending-profiles';
import { MainMenu } from '@/pages/home/main-menu';

export function HomePage() {
  const signOut = useSignOut();
  const { data: profile } = useCurrentProfile();
  const { isAdmin, can } = usePermissions();
  const canManageApprovals = can('manage_approvals');
  const canManageSettings = can('manage_settings');
  const { data: pending } = usePendingProfiles({ enabled: canManageApprovals });
  const pendingCount = pending?.length ?? 0;
  const hasPending = pendingCount > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to="/" aria-label="Pelada dos Amigos — início" className="flex items-center gap-2">
          <img
            src="/logo.jpeg"
            alt="Pelada dos Amigos"
            className="size-9 rounded-full object-cover"
          />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Pelada dos Amigos
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="hidden pr-2 text-right sm:block">
            <p className="text-xs leading-tight font-medium">{profile?.display_name}</p>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {isAdmin ? 'Admin' : profile?.role === 'player' ? 'Jogador' : 'Espectador'}
            </p>
          </div>
          <ThemeToggle />
          <div className="hidden items-center gap-1 sm:flex">
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
                      className="bg-primary ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
                    />
                  ) : null}
                </Link>
              </Button>
            ) : null}
            {canManageSettings ? (
              <Button asChild variant="ghost" size="icon" aria-label="Configurações">
                <Link to="/admin/settings">
                  <Settings className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="icon" aria-label="Peladas">
              <Link to="/matches">
                <CalendarDays className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Financeiro">
              <Link to="/finance">
                <Wallet className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Time">
              <Link to="/team">
                <Users className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Meu cadastro">
              <Link to="/me">
                <User className="size-4" />
              </Link>
            </Button>
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
          <div className="sm:hidden">
            <MainMenu />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <img
            src="/logo.jpeg"
            alt="Pelada dos Amigos"
            className="size-28 rounded-full object-cover shadow-md"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Bem-vindo{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">
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
