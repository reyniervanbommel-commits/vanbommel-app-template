import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import AuthGuard from './components/auth/AuthGuard';
import LoginPage from './components/auth/LoginPage';
import SetPasswordPage from './components/auth/SetPasswordPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import MfaPage from './components/auth/MfaPage';
import AdminPage from './components/admin/AdminPage';
import { ROLES } from './constants/roles';
import { PurchaseOrdersPage } from './components/supplier';
import { AppFooter, AppLayout } from './components/layout';

const useStyles = makeStyles({
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
  },
  devBanner: {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorNeutralForeground1,
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    zIndex: 9999,
  },
  devBadgeWrap: {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
  },
});

export default function App() {
  const styles = useStyles();

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
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout>
                  <PurchaseOrdersPage />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <AppFooter />

      {import.meta.env.DEV ? (
        <div className={styles.devBadgeWrap}>
          <div className={styles.devBanner}>DEV</div>
        </div>
      ) : null}
    </div>
  );
}
