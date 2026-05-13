import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/features/auth/api/use-session';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import type { ProfileStatus, ProfileRole } from '@/features/auth/types';

type RequireAuthProps = {
  allowedStatus?: ProfileStatus[];
  allowedRoles?: ProfileRole[];
  requireAdmin?: boolean;
};

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function RequireAuth({
  allowedStatus = ['approved'],
  allowedRoles,
  requireAdmin = false,
}: RequireAuthProps) {
  const location = useLocation();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();

  if (sessionLoading) return <FullScreenLoader />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profileLoading) return <FullScreenLoader />;

  if (!profile) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (profile.status === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (profile.status === 'denied') {
    return <Navigate to="/access-denied" replace />;
  }

  if (!allowedStatus.includes(profile.status)) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requireAdmin && !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && (!profile.role || !allowedRoles.includes(profile.role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading: sessionLoading } = useSession();
  if (sessionLoading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
