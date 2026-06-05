import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Field, Input, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', padding: '40px', width: '400px', boxShadow: tokens.shadow16 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: '14px' },
});

export default function SetPasswordPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setPassword } = useAuth();
  const email = searchParams.get('email') || '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pw !== confirm) return setError('Wachtwoorden komen niet overeen');
    if (pw.length < 8) return setError('Wachtwoord moet minimaal 8 tekens lang zijn');
    setError('');
    setLoading(true);
    try {
      await setPassword(email, pw);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Wachtwoord instellen</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Nieuw wachtwoord"><Input type="password" value={pw} onChange={e => setPw(e.target.value)} required /></Field>
          <Field label="Bevestig wachtwoord"><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></Field>
          {error && <div className={styles.error}>{error}</div>}
          <Button appearance="primary" type="submit" disabled={loading}>{loading ? 'Bezig...' : 'Instellen'}</Button>
        </form>
      </div>
    </div>
  );
}
