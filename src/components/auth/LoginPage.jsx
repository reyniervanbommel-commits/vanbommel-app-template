import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailChange = useCallback((_, data) => setEmail(data.value), []);
  const handlePasswordChange = useCallback((_, data) => setPassword(data.value), []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresPasswordSetup) {
        navigate('/set-password?email=' + encodeURIComponent(email));
      } else if (result.requiresMfa) {
        navigate('/mfa');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Inloggen mislukt. Controleer uw gegevens.');
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
            style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>

        <div>
          <Text className={styles.title} block>Inloggen</Text>
          <Text className={styles.subtitle} block>{APP_DISPLAY_NAME}</Text>
        </div>

        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="E-mailadres" required>
            <Input
              type="email"
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              disabled={loading}
            />
          </Field>
          <Field label="Wachtwoord" required>
            <Input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </Field>

          <div className={styles.actions}>
            <Link to="/forgot-password">Wachtwoord vergeten?</Link>
            <Button
              appearance="primary"
              type="submit"
              disabled={loading || !email || !password}
              icon={loading ? <Spinner size="tiny" /> : null}
            >
              {loading ? 'Bezig...' : 'Inloggen'}
            </Button>
          </div>
        </form>

        <Text className={styles.version}>{APP_VERSION}</Text>
      </Card>
    </div>
  );
}
