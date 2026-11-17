import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider, Skeleton } from './components/ui';
import Shell from './components/Shell';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import type { Role } from './types';

// Private areas are split into their own chunks: visitors to the public page never download them.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const PageLoading = () => (
  <div className="mx-auto max-w-7xl space-y-4 px-4 py-6" aria-busy="true" aria-label="Loading">
    <Skeleton className="h-12" /><Skeleton className="h-64" /><Skeleton className="h-40" />
  </div>
);

/** Route guard. The real protection is RLS + Edge Function checks; this only routes people sensibly. */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to={profile.role === 'admin' ? '/admin' : '/app'} replace />;
  return <>{children}</>;
}

const CustomerLayout = () => (
  <Shell area="customer"><Suspense fallback={<PageLoading />}><Outlet /></Suspense></Shell>
);
const AdminLayout = () => (
  <Shell area="admin"><Suspense fallback={<PageLoading />}><Outlet /></Suspense></Shell>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route path="/app" element={<RequireRole role="customer"><CustomerLayout /></RequireRole>}>
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
                <Route index element={<AdminPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
