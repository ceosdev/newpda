import { Route, Routes } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { RequireAuth, RedirectIfAuthenticated } from '@/features/auth/components/require-auth';
import { LoginPage } from '@/pages/auth/login';
import { SignupPage } from '@/pages/auth/signup';
import { PendingApprovalPage } from '@/pages/pending-approval';
import { AccessDeniedPage } from '@/pages/access-denied';
import { HomePage } from '@/pages/home';

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
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route path="*" element={<RequireAuth />}>
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </Providers>
  );
}
