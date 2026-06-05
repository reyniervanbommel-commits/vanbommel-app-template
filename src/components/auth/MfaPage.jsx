import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Input, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', padding: '40px', width: '400px', boxShadow: tokens.shadow16 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: '14px' },
});

export default function MfaPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
        <h2>Twee-factor verificatie</h2>
        <p>Voer je authenticator-code in.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Code"><Input value={code} onChange={e => setCode(e.target.value)} maxLength={6} required /></Field>
          {error && <div className={styles.error}>{error}</div>}
          <Button appearance="primary" type="submit" disabled={loading}>{loading ? 'Controleren...' : 'Verifiëren'}</Button>
        </form>
      </div>
    </div>
  );
}
