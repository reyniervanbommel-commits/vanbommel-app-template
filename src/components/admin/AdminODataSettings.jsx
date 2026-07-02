import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Field,
  Input,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import ODataInfoDialog from './ODataInfoDialog';

const useStyles = makeStyles({
  root: { maxWidth: '720px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dbHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding('8px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
  },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  sectionTitle: { marginBottom: '4px' },
  statusGrid: { display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  statusRow: { display: 'flex', ...shorthands.gap('8px'), alignItems: 'center', flexWrap: 'wrap' },
  statusLabel: { color: tokens.colorNeutralForeground3, minWidth: '170px', fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, wordBreak: 'break-all' },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', flexWrap: 'wrap' },
});

const AUTH_LABELS = {
  oauth_client_credentials: { label: 'OAuth2 client-credentials', color: 'success' },
  static_bearer_token: { label: 'Statisch bearer token (legacy)', color: 'warning' },
  none: { label: 'Niet geconfigureerd', color: 'danger' },
};

const EMPTY_FORM = {
  D365_ODATA_BASE_URL: '',
  D365_ODATA_PURCHASE_ORDERS_PATH: '',
  D365_ODATA_COMPANY: '',
  D365_ODATA_TIMEOUT_MS: '',
  D365_ODATA_TENANT_ID: '',
  D365_ODATA_CLIENT_ID: '',
  D365_ODATA_CLIENT_SECRET: '',
  PO_SYNC_FILTER: '',
  PO_SYNC_MAX_ORDERS: '',
  PO_CACHE_STALE_MINUTES: '',
};

export default function AdminODataSettings() {
  const styles = useStyles();

  const [form, setForm] = useState(EMPTY_FORM);
  const [derived, setDerived] = useState({});
  const [secretSet, setSecretSet] = useState({ clientSecret: false });
  const [dbSource, setDbSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/admin/settings/odata');
      const s = data.settings || {};
      setDbSource(data.source || 'app_settings');
      setDerived(data.derived || {});
      setSecretSet({
        clientSecret: !!s.D365_ODATA_CLIENT_SECRET_SET,
      });
      setForm({
        D365_ODATA_BASE_URL: s.D365_ODATA_BASE_URL || '',
        D365_ODATA_PURCHASE_ORDERS_PATH: s.D365_ODATA_PURCHASE_ORDERS_PATH || '/data/PurchaseOrderHeadersV2',
        D365_ODATA_COMPANY: s.D365_ODATA_COMPANY || '',
        D365_ODATA_TIMEOUT_MS: s.D365_ODATA_TIMEOUT_MS || '20000',
        D365_ODATA_TENANT_ID: s.D365_ODATA_TENANT_ID || '',
        D365_ODATA_CLIENT_ID: s.D365_ODATA_CLIENT_ID || '',
        D365_ODATA_CLIENT_SECRET: '',
        PO_SYNC_FILTER: s.PO_SYNC_FILTER || '',
        PO_SYNC_MAX_ORDERS: s.PO_SYNC_MAX_ORDERS || '2000',
        PO_CACHE_STALE_MINUTES: s.PO_CACHE_STALE_MINUTES || '15',
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
      // Lege secret niet meesturen → bestaande waarde blijft behouden.
      const payload = { ...form };
      if (!payload.D365_ODATA_CLIENT_SECRET) delete payload.D365_ODATA_CLIENT_SECRET;
      await apiRequest('/admin/settings/odata', { method: 'POST', body: payload });
      setFeedback('Instellingen opgeslagen in SQL (dbo.app_settings).');
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [form, loadSettings]);

  if (loading) return <Spinner label="Loading from database..." />;

  const auth = AUTH_LABELS[derived.authMethod] || AUTH_LABELS.none;

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Text size={600} weight="semibold">OData-koppeling (D365)</Text>
        <ODataInfoDialog />
      </div>

      <Text className={styles.dbHint} block>
        Settings are loaded from and saved to SQL table <strong>dbo.{dbSource}</strong>.
        Secrets (client secret) are never returned to this page; leave the field empty to keep
        the existing value. Which tables and columns are fetched is managed on the{' '}
        <strong>Data model</strong> tab.
      </Text>

      {/* Statusoverzicht: wat haalt de app op en hoe authenticeert het */}
      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Huidige status</Text>
        <div className={styles.statusGrid}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Authenticatie</span>
            <Badge appearance="tint" color={auth.color}>{auth.label}</Badge>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Wordt opgehaald uit</span>
            <span className={styles.mono}>{derived.entityUrl || '—'}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Bedrijfscode (company)</span>
            <span className={styles.mono}>{form.D365_ODATA_COMPANY || '—'}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>OAuth-scope</span>
            <span className={styles.mono}>{derived.scope || '—'}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Token-endpoint</span>
            <span className={styles.mono}>{derived.tokenEndpoint || '—'}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Client secret</span>
            <Badge appearance="tint" color={secretSet.clientSecret ? 'success' : 'danger'}>
              {secretSet.clientSecret ? 'Ingesteld' : 'Ontbreekt'}
            </Badge>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Verbinding</Text>
        <Field label="OData basis-URL">
          <Input
            placeholder="https://vanbommel-acc.sandbox.operations.dynamics.com"
            value={form.D365_ODATA_BASE_URL}
            onChange={handleChange('D365_ODATA_BASE_URL')}
          />
        </Field>
        <Field label="Purchase Orders pad (entiteit)">
          <Input
            placeholder="/data/PurchaseOrderHeadersV2"
            value={form.D365_ODATA_PURCHASE_ORDERS_PATH}
            onChange={handleChange('D365_ODATA_PURCHASE_ORDERS_PATH')}
          />
        </Field>
        <Field label="Bedrijfscode (company)">
          <Input placeholder="WHSL" value={form.D365_ODATA_COMPANY} onChange={handleChange('D365_ODATA_COMPANY')} />
        </Field>
        <Field label="Timeout (ms)">
          <Input type="number" placeholder="20000" value={form.D365_ODATA_TIMEOUT_MS} onChange={handleChange('D365_ODATA_TIMEOUT_MS')} />
        </Field>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Authenticatie — OAuth2 client-credentials</Text>
        <Text className={styles.hint} block>
          Aanbevolen methode. De app haalt zelf een token op bij Azure AD en ververst het automatisch
          vóór expiry. Scope = basis-URL + <span className={styles.mono}>/.default</span>.
        </Text>
        <Field label="Tenant ID">
          <Input placeholder="00000000-0000-0000-0000-000000000000" value={form.D365_ODATA_TENANT_ID} onChange={handleChange('D365_ODATA_TENANT_ID')} />
        </Field>
        <Field label="Client ID (app-registratie)">
          <Input placeholder="00000000-0000-0000-0000-000000000000" value={form.D365_ODATA_CLIENT_ID} onChange={handleChange('D365_ODATA_CLIENT_ID')} />
        </Field>
        <Field
          label="Client secret"
          hint={secretSet.clientSecret ? 'Er is een secret ingesteld. Laat leeg om te behouden; vul in om te vervangen.' : 'Nog geen secret ingesteld.'}
        >
          <Input type="password" placeholder={secretSet.clientSecret ? '•••••••• (ingesteld)' : 'Client secret'} value={form.D365_ODATA_CLIENT_SECRET} onChange={handleChange('D365_ODATA_CLIENT_SECRET')} />
        </Field>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Cache-synchronisatie</Text>
        <Text className={styles.hint} block>
          Bepaalt welke purchase orders in de SQL-cache worden gesynchroniseerd. Zonder scope-filter
          zou de volledige dataset (~19.913 orders) worden opgehaald en vastlopen.
        </Text>
        <Field label="Scope-filter (ruwe OData $filter)" hint="Bijv. PurchaseOrderStatus ne Microsoft.Dynamics.DataEntities.PurchStatus'Canceled'">
          <Input placeholder="(leeg = alles, tot de cap)" value={form.PO_SYNC_FILTER} onChange={handleChange('PO_SYNC_FILTER')} />
        </Field>
        <Field label="Max. aantal orders per sync (cap)">
          <Input type="number" placeholder="2000" value={form.PO_SYNC_MAX_ORDERS} onChange={handleChange('PO_SYNC_MAX_ORDERS')} />
        </Field>
        <Field label="Cache verouderd na (minuten)">
          <Input type="number" placeholder="15" value={form.PO_CACHE_STALE_MINUTES} onChange={handleChange('PO_CACHE_STALE_MINUTES')} />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Opslaan...' : 'Opslaan in database'}
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {error && <Text className={styles.error}>{error}</Text>}
      </div>
    </div>
  );
}
