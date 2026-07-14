import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, makeStyles, Spinner } from '@fluentui/react-components';
import { createCustomTheme } from './theme/customTheme';
import AuthGuard from './components/auth/AuthGuard';
import LoginPage from './components/auth/LoginPage';
import { ROLES } from './constants/roles';
import { AppFooter, AppLayout, DevFeatureChecklist, DevPerfOverlay } from './components/layout';
import AppToaster from './components/shared/AppToaster';
import { useRouteAnalytics } from './hooks/useRouteAnalytics';

// Route-based code-splitting: de admin-module (incl. de zware recharts-bibliotheek), de
// hoofd-board-pagina en de secundaire auth-pagina's worden pas geladen wanneer hun route bezocht
// wordt. Zo bevat de initiële bundle enkel de shell + LoginPage. LoginPage blijft eager zodat de
// eerste (uitgelogde) render geen Suspense-flits geeft.
const SetPasswordPage = lazy(() => import('./components/auth/SetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage'));
const MfaPage = lazy(() => import('./components/auth/MfaPage'));
const AdminPage = lazy(() => import('./components/admin/AdminPage'));
const PurchaseOrdersPage = lazy(() =>
  import('./components/supplier').then((m) => ({ default: m.PurchaseOrdersPage })),
);

const useStyles = makeStyles({
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
  },
  routeFallback: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
});

function AppInner({ isDarkMode, onToggleTheme }) {
  const styles = useStyles();
  const isDevEnvironment = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'dev';
  // Perf-HUD ook op de preview tonen (niet in productie), zodat we daar de snelheid kunnen meten.
  const isPerfEnabled = isDevEnvironment || import.meta.env.VITE_APP_ENV === 'preview';
  useRouteAnalytics();

  return (
    <div className={styles.appShell}>
      <div className={styles.content}>
        <Suspense fallback={<div className={styles.routeFallback}><Spinner label="Loading…" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mfa" element={<MfaPage />} />
          <Route
            path="/admin"
            element={
              <AuthGuard allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]}>
                <AppLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
                  <AdminPage />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
                  <PurchaseOrdersPage />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>

      <AppFooter />
      <AppToaster />

      {isDevEnvironment ? <DevFeatureChecklist /> : null}
      {isPerfEnabled ? <DevPerfOverlay /> : null}
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Memoiseer het theme-object zodat FluentProvider niet bij elke App-render een nieuw theme
  // krijgt (wat de hele Fluent-componentenboom onnodig zou hertekenen).
  const theme = useMemo(() => createCustomTheme(isDarkMode), [isDarkMode]);
  const handleToggleTheme = () => setIsDarkMode((v) => !v);

  return (
    <FluentProvider theme={theme}>
      <AppInner isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
    </FluentProvider>
  );
}
