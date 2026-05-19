import { useState } from 'react';
import {
  CalendarDays,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSignOut } from '@/features/auth/api/use-sign-out';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { usePendingProfiles } from '@/features/admin/api/use-pending-profiles';

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

/**
 * Menu de navegação mobile do header da home. No mobile a fileira de ícones não
 * cabe sem espremer a logo — aqui ela vira um botão único que abre uma lista
 * com nome + ícone de cada destino.
 */
export function MainMenu() {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const { can } = usePermissions();
  const canManageApprovals = can('manage_approvals');
  const canManageSettings = can('manage_settings');
  const { data: pending } = usePendingProfiles({ enabled: canManageApprovals });
  const pendingCount = pending?.length ?? 0;
  const hasPending = pendingCount > 0;

  const items: NavItem[] = [
    ...(canManageApprovals
      ? [
          {
            to: '/admin/approvals',
            label: 'Aprovações',
            icon: ShieldCheck,
            badge: pendingCount,
          } satisfies NavItem,
        ]
      : []),
    ...(canManageSettings
      ? [{ to: '/admin/settings', label: 'Configurações', icon: Settings } satisfies NavItem]
      : []),
    { to: '/matches', label: 'Peladas', icon: CalendarDays },
    { to: '/finance', label: 'Financeiro', icon: Wallet },
    { to: '/team', label: 'Time', icon: Users },
    { to: '/me', label: 'Meu cadastro', icon: User },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Menu"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" />
        {hasPending ? (
          <span
            aria-hidden
            className="bg-primary ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
          />
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Navegação principal do app</SheetDescription>
          </SheetHeader>

          <nav className="mt-2 flex flex-col px-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium"
                >
                  <Icon aria-hidden className="text-muted-foreground size-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs font-semibold">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}

            <div aria-hidden className="my-1 border-t" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut.mutate();
              }}
              disabled={signOut.isPending}
              className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium disabled:opacity-50"
            >
              <LogOut aria-hidden className="text-muted-foreground size-4" />
              <span>Sair</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
