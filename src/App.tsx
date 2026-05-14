import { Route, Routes } from 'react-router-dom';
import { Providers } from '@/app/providers';
import {
  RequireAuth,
  RequireSession,
  RedirectIfAuthenticated,
} from '@/features/auth/components/require-auth';
import { LoginPage } from '@/pages/auth/login';
import { SignupPage } from '@/pages/auth/signup';
import { PendingApprovalPage } from '@/pages/pending-approval';
import { AccessDeniedPage } from '@/pages/access-denied';
import { HomePage } from '@/pages/home';
import { MePage } from '@/pages/me';
import { ApprovalsPage } from '@/pages/admin/approvals';
import { TeamPage } from '@/pages/team';
import { MatchesPage } from '@/pages/matches';
import { MatchDetailPage } from '@/pages/matches/detail';

export function App() {
  return (
    <Providers>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <SignupPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route element={<RequireSession />}>
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Route>

        <Route element={<RequireAuth requireAdmin />}>
          <Route path="/admin/approvals" element={<ApprovalsPage />} />
        </Route>

        <Route path="*" element={<RequireAuth />}>
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </Providers>
  );
}
