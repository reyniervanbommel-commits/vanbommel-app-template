import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Field, Input, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', padding: '40px', width: '400px', boxShadow: tokens.shadow16 },
  title: { marginBottom: '24px', fontSize: '24px', fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: '14px' },
});

export default function LoginPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.title}>Inloggen</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="E-mailadres"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
          <Field label="Wachtwoord"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
          {error && <div className={styles.error}>{error}</div>}
          <Button appearance="primary" type="submit" disabled={loading}>{loading ? 'Bezig...' : 'Inloggen'}</Button>
          <Button appearance="transparent" onClick={() => navigate('/forgot-password')}>Wachtwoord vergeten?</Button>
        </form>
      </div>
    </div>
  );
}
