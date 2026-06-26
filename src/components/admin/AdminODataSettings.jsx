import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Eye24Regular, EyeOff24Regular, Save24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

const useStyles = makeStyles({
  root: { maxWidth: '560px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  sectionTitle: { marginBottom: '4px' },
  row: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'flex-end' },
  tokenInput: { flex: 1 },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center' },
});

export default function AdminODataSettings() {
  const styles = useStyles();

  const [form, setForm] = useState({
    D365_ODATA_BASE_URL: '',
    D365_ODATA_PURCHASE_ORDERS_PATH: '',
    D365_ODATA_COMPANY: '',
    D365_ODATA_BEARER_TOKEN: '',
    D365_ODATA_TIMEOUT_MS: '',
  });
  const [tokenSet, setTokenSet] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/settings/odata');
      const s = data.settings || {};
      setTokenSet(!!s.D365_ODATA_BEARER_TOKEN_SET);
      setForm({
        D365_ODATA_BASE_URL: s.D365_ODATA_BASE_URL || '',
        D365_ODATA_PURCHASE_ORDERS_PATH: s.D365_ODATA_PURCHASE_ORDERS_PATH || '',
        D365_ODATA_COMPANY: s.D365_ODATA_COMPANY || '',
        D365_ODATA_BEARER_TOKEN: '',
        D365_ODATA_TIMEOUT_MS: s.D365_ODATA_TIMEOUT_MS || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleChange = useCallback((key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFeedback('');
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFeedback('');
    setError('');
    try {
      await apiRequest('/admin/settings/odata', { method: 'POST', body: form });
      setFeedback('Instellingen opgeslagen.');
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [form, loadSettings]);

  const toggleShowToken = useCallback(() => setShowToken((v) => !v), []);

  if (loading) return <Spinner label="Laden..." />;

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Verbinding</Text>
        <Field label="OData basis-URL">
          <Input
            placeholder="https://mijn-d365.operations.dynamics.com"
            value={form.D365_ODATA_BASE_URL}
            onChange={handleChange('D365_ODATA_BASE_URL')}
          />
        </Field>
        <Field label="Purchase Orders pad">
          <Input
            placeholder="/data/PurchaseOrderHeadersV2"
            value={form.D365_ODATA_PURCHASE_ORDERS_PATH}
            onChange={handleChange('D365_ODATA_PURCHASE_ORDERS_PATH')}
          />
        </Field>
        <Field label="Bedrijfscode (company)">
          <Input
            placeholder="usmf"
            value={form.D365_ODATA_COMPANY}
            onChange={handleChange('D365_ODATA_COMPANY')}
          />
        </Field>
        <Field label="Timeout (ms)">
          <Input
            type="number"
            placeholder="10000"
            value={form.D365_ODATA_TIMEOUT_MS}
            onChange={handleChange('D365_ODATA_TIMEOUT_MS')}
          />
        </Field>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Authenticatie</Text>
        {tokenSet && (
          <Text className={styles.hint}>Er is al een bearer token opgeslagen. Laat leeg om het ongewijzigd te laten.</Text>
        )}
        <Field label="Bearer token">
          <div className={styles.row}>
            <Input
              className={styles.tokenInput}
              type={showToken ? 'text' : 'password'}
              placeholder={tokenSet ? '••••••••  (ongewijzigd laten)' : 'Bearer token invoeren'}
              value={form.D365_ODATA_BEARER_TOKEN}
              onChange={handleChange('D365_ODATA_BEARER_TOKEN')}
            />
            <Button
              appearance="subtle"
              icon={showToken ? <EyeOff24Regular /> : <Eye24Regular />}
              onClick={toggleShowToken}
              title={showToken ? 'Verbergen' : 'Tonen'}
            />
          </div>
        </Field>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          icon={<Save24Regular />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {error && <Text className={styles.error}>{error}</Text>}
      </div>
    </div>
  );
}
