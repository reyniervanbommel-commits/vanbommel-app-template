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

const useStyles = makeStyles({
  page: { padding: '24px' },
  devBanner: {
    position: 'fixed', bottom: '16px', right: '16px',
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorNeutralForeground1,
    padding: '4px 12px', borderRadius: '4px',
    fontSize: '12px', fontWeight: 600, zIndex: 9999,
  },
  footer: {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    padding: '8px 12px',
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground3,
    borderTop: '1px solid ' + tokens.colorNeutralStroke2,
    fontSize: '12px',
  },
});

function HomePage() {
  const styles = useStyles();
  return (
    <div className={styles.page}>
      <h1>Home</h1>
      <p>Vervang dit met je app-inhoud.</p>
      {import.meta.env.DEV && <div className={styles.devBanner}>DEV</div>}
    </div>
  );
}

function VersionFooter() {
  const styles = useStyles();
  return <footer className={styles.footer}>Versie v1.0.1</footer>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/mfa" element={<MfaPage />} />
        <Route path="/admin" element={<AuthGuard allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]}><AdminPage /></AuthGuard>} />
        <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <VersionFooter />
    </>
  );
}
