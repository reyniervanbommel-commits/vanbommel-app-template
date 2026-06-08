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

const useStyles = makeStyles({
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  appContent: {
    flex: 1,
  },
  homeContainer: {
    padding: '24px',
  },
  devBanner: {
    position: 'fixed', bottom: '16px', right: '16px',
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorNeutralForeground1,
    padding: '4px 12px', borderRadius: '4px',
    fontSize: '12px', fontWeight: 600, zIndex: 9999,
  },
  footer: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '8px 16px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

const APP_VERSION = 'v1.0.4';

function HomePage() {
  const styles = useStyles();
  return (
    <div className={styles.homeContainer}>
      <h1>Home</h1>
      <p>Vervang dit met je app-inhoud.</p>
      {import.meta.env.DEV && <div className={styles.devBanner}>DEV</div>}
    </div>
  );
}

export default function App() {
  const styles = useStyles();

  return (
    <div className={styles.appShell}>
      <main className={styles.appContent}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mfa" element={<MfaPage />} />
          <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
          <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className={styles.footer}>{APP_VERSION}</footer>
    </div>
  );
}
