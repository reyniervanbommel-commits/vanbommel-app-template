import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, makeStyles } from '@fluentui/react-components';
import { createCustomTheme } from './theme/customTheme';
import AuthGuard from './components/auth/AuthGuard';
import LoginPage from './components/auth/LoginPage';
import SetPasswordPage from './components/auth/SetPasswordPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import MfaPage from './components/auth/MfaPage';
import AdminPage from './components/admin/AdminPage';
import { ROLES } from './constants/roles';
import { PurchaseOrdersPage } from './components/supplier';
import { TableViewerPage } from './components/tables';
import { AppFooter, AppLayout, DevFeatureChecklist } from './components/layout';
import { useRouteAnalytics } from './hooks/useRouteAnalytics';

const useStyles = makeStyles({
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
  },
});

function AppInner({ isDarkMode, onToggleTheme }) {
  const styles = useStyles();
  const isDevEnvironment = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'dev';
  useRouteAnalytics();

  return (
    <div className={styles.appShell}>
      <div className={styles.content}>
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
          {/* Generieke tabel-viewer (#139): tableKey uit de route → useTableGrid. */}
          <Route
            path="/tables/:tableKey"
            element={
              <AuthGuard>
                <AppLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
                  <TableViewerPage />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <AppFooter />

      {isDevEnvironment ? <DevFeatureChecklist /> : null}
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = createCustomTheme(isDarkMode);
  const handleToggleTheme = () => setIsDarkMode((v) => !v);

  return (
    <FluentProvider theme={theme}>
      <AppInner isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
    </FluentProvider>
  );
}
