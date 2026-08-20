import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLoginReasonMessage } from '../../utils/sessionExpiry';
import {
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { APP_DISPLAY_NAME } from '../../config/app';
import { APP_VERSION } from '../../config/version';

const LAST_LOGIN_EMAIL_KEY = 'auth:last-login-email';

function getStoredLoginEmail() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || '';
  } catch (_) {
    return '';
  }
}

function storeLoginEmail(email) {
  if (typeof window === 'undefined') return;
  try {
    if (email) {
      window.localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);
      return;
    }
    window.localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
  } catch (_) {
    // Ignore storage errors (private mode/quota) and keep login flow working.
  }
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(150deg, #F5F3F0 0%, #E8E4DF 40%, #D0D8E8 100%)',
    ...shorthands.padding('24px'),
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    ...shorthands.padding('40px', '32px'),
    boxShadow: '0 12px 48px rgba(22, 38, 61, 0.14), 0 2px 8px rgba(22, 38, 61, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    ...shorthands.gap('20px'),
    borderRadius: '10px',
  },
  logos: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    marginTop: '4px',
  },
  form: { display: 'flex', flexDirection: 'column', ...shorthands.gap('14px') },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  version: { fontSize: '11px', color: tokens.colorNeutralForeground4, textAlign: 'center' },
});

export default function LoginPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState(() => getStoredLoginEmail());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reasonMessage = getLoginReasonMessage(searchParams.get('reason'));

  const handleEmailChange = useCallback((_, data) => setEmail(data.value), []);
  const handlePasswordChange = useCallback((_, data) => setPassword(data.value), []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const loginEmail = email.trim();
    try {
      const result = await login(loginEmail, password);
      storeLoginEmail(loginEmail);
      if (result.requiresPasswordSetup) {
        navigate('/set-password?email=' + encodeURIComponent(loginEmail));
      } else if (result.requiresMfa) {
        navigate('/mfa');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard}>
        <div className={styles.logos}>
          <img
            src="/logo-circle.png"
            alt={APP_DISPLAY_NAME + ' logo'}
            style={{ width: '112px', height: '112px', borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>

        <div>
          <Text className={styles.title} block>Sign in</Text>
          <Text className={styles.subtitle} block>{APP_DISPLAY_NAME}</Text>
        </div>

        {reasonMessage && !error && (
          <MessageBar intent="warning">
            <MessageBarBody>{reasonMessage}</MessageBarBody>
          </MessageBar>
        )}

        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}

        <form className={styles.form} onSubmit={handleSubmit} autoComplete="on">
          <Field label="Email address" required>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              disabled={loading}
            />
          </Field>
          <Field label="Password" required>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </Field>

          <div className={styles.actions}>
            <Link to="/forgot-password">Forgot password?</Link>
            <Button
              appearance="primary"
              type="submit"
              disabled={loading || !email || !password}
              icon={loading ? <Spinner size="tiny" /> : null}
            >
              {loading ? 'Working...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <Text className={styles.version}>{APP_VERSION}</Text>
      </Card>
    </div>
  );
}
