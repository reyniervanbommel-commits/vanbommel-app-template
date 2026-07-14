import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Input, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', padding: '40px', width: '400px', boxShadow: tokens.shadow16 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  success: { color: tokens.colorPaletteGreenForeground1, fontSize: '14px' },
  devBox: {
    marginTop: '16px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    fontSize: '13px',
    wordBreak: 'break-all',
  },
});

export default function ForgotPasswordPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const [devNotice, setDevNotice] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (data && data.devResetUrl) setDevResetUrl(data.devResetUrl);
      if (data && data.devNotice) setDevNotice(data.devNotice);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Forgot password</h2>
        {sent ? (
          <div>
            <div className={styles.success}>If the email address is known, you will receive a reset link.</div>
            {devResetUrl && (
              <div className={styles.devBox}>
                <strong>DEV:</strong> email not sent. Use this reset link:
                <br />
                <a href={devResetUrl}>{devResetUrl}</a>
              </div>
            )}
            {!devResetUrl && devNotice && (
              <div className={styles.devBox}>{devNotice}</div>
            )}
            <Button onClick={() => navigate('/login')} style={{ marginTop: '16px' }}>Back to sign in</Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <Field label="Email address"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
            <Button appearance="primary" type="submit" disabled={loading}>{loading ? 'Working...' : 'Send reset link'}</Button>
            <Button appearance="transparent" onClick={() => navigate('/login')}>Back</Button>
          </form>
        )}
      </div>
    </div>
  );
}
