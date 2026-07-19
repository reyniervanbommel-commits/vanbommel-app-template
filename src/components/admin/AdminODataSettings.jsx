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
  static_bearer_token: { label: 'Static bearer token (legacy)', color: 'warning' },
  none: { label: 'Not configured', color: 'danger' },
};

const EMPTY_FORM = {
  D365_ODATA_BASE_URL: '',
  D365_ODATA_PURCHASE_ORDERS_PATH: '',
  D365_ODATA_COMPANY: '',
  D365_ODATA_TIMEOUT_MS: '',
  D365_ODATA_TENANT_ID: '',
  D365_ODATA_CLIENT_ID: '',
  D365_ODATA_CLIENT_SECRET: '',
  D365_ODATA_CLIENT_SECRET_EXPIRES_AT: '',
  PO_SYNC_MAX_ORDERS: '',
  PO_CACHE_STALE_MINUTES: '',
};

const EXPIRY_BADGE = {
  expired: { color: 'danger', label: 'Expired' },
  warning: { color: 'warning', label: 'Expires soon' },
  ok: { color: 'success', label: 'Valid' },
  unknown: { color: 'informative', label: 'Not set' },
};

// Input type="date" verwacht yyyy-MM-dd; de backend levert een volledige ISO-timestamp.
const toDateInputValue = (raw) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
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
        D365_ODATA_CLIENT_SECRET_EXPIRES_AT: toDateInputValue(s.D365_ODATA_CLIENT_SECRET_EXPIRES_AT),
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
      setFeedback('Settings saved in SQL (dbo.app_settings).');
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [form, loadSettings]);

  if (loading) return <Spinner label="Loading from database..." />;

  const auth = AUTH_LABELS[derived.authMethod] || AUTH_LABELS.none;
  const expiry = derived.clientSecretExpiry || {};
  const expiryBadge = EXPIRY_BADGE[expiry.status] || EXPIRY_BADGE.unknown;

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Text size={600} weight="semibold">OData connection (D365)</Text>
        <ODataInfoDialog />
      </div>

      <Text className={styles.dbHint} block>
        Settings are loaded from and saved to SQL table <strong>dbo.{dbSource}</strong>.
        Secrets (client secret) are never returned to this page; leave the field empty to keep
        the existing value. Which tables and columns are fetched is managed on the{' '}
        <strong>Data model</strong> tab. The path below configures headers; lines are linked automatically.
      </Text>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Current status</Text>
        <div className={styles.statusGrid}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Authentication</span>
            <Badge appearance="tint" color={auth.color}>{auth.label}</Badge>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Company</span>
            <span className={styles.mono}>{form.D365_ODATA_COMPANY || '—'}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Client secret</span>
            <Badge appearance="tint" color={secretSet.clientSecret ? 'success' : 'danger'}>
              {secretSet.clientSecret ? 'Configured' : 'Missing'}
            </Badge>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Secret expiry</span>
            <Badge appearance="tint" color={expiryBadge.color}>{expiryBadge.label}</Badge>
            {expiry.expiresAt && (
              <span className={styles.hint}>
                {toDateInputValue(expiry.expiresAt)}
                {typeof expiry.daysRemaining === 'number' && expiry.daysRemaining > 0
                  ? ` — ${expiry.daysRemaining} days left`
                  : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Connection</Text>
        <Field label="OData base URL">
          <Input
            placeholder="https://vanbommel-acc.sandbox.operations.dynamics.com"
            value={form.D365_ODATA_BASE_URL}
            onChange={handleChange('D365_ODATA_BASE_URL')}
          />
        </Field>
        <Field label="Purchase order headers path (entity)">
          <Input
            placeholder="/data/PurchaseOrderHeadersV2"
            value={form.D365_ODATA_PURCHASE_ORDERS_PATH}
            onChange={handleChange('D365_ODATA_PURCHASE_ORDERS_PATH')}
          />
        </Field>
        <Text className={styles.hint} block>
          Lines are loaded from the related entity via <span className={styles.mono}>$expand=PurchaseOrderLines</span>.
          Line-level write-back targets <span className={styles.mono}>/data/PurchaseOrderLinesV2</span>.
        </Text>
        <Field label="Company code">
          <Input placeholder="WHSL" value={form.D365_ODATA_COMPANY} onChange={handleChange('D365_ODATA_COMPANY')} />
        </Field>
        <Field label="Timeout (ms)">
          <Input type="number" placeholder="20000" value={form.D365_ODATA_TIMEOUT_MS} onChange={handleChange('D365_ODATA_TIMEOUT_MS')} />
        </Field>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Authentication — OAuth2 client-credentials</Text>
        <Text className={styles.hint} block>
          Recommended method. The app fetches a token from Azure AD and refreshes it automatically
          before expiry. Scope = base URL + <span className={styles.mono}>/.default</span>.
        </Text>
        <Field label="Tenant ID">
          <Input placeholder="00000000-0000-0000-0000-000000000000" value={form.D365_ODATA_TENANT_ID} onChange={handleChange('D365_ODATA_TENANT_ID')} />
        </Field>
        <Field label="Client ID (app registration)">
          <Input placeholder="00000000-0000-0000-0000-000000000000" value={form.D365_ODATA_CLIENT_ID} onChange={handleChange('D365_ODATA_CLIENT_ID')} />
        </Field>
        <Field
          label="Client secret"
          hint={secretSet.clientSecret ? 'A secret is configured. Leave empty to keep it; enter a value to replace it.' : 'No secret configured yet.'}
        >
          <Input type="password" placeholder={secretSet.clientSecret ? '•••••••• (configured)' : 'Client secret'} value={form.D365_ODATA_CLIENT_SECRET} onChange={handleChange('D365_ODATA_CLIENT_SECRET')} />
        </Field>
        <Field
          label="Client secret expires on"
          hint="Admins are warned in the app from 30 days before this date, and keep being warned until it is updated. Set this to the new expiry date whenever you rotate the secret."
        >
          <Input
            type="date"
            value={form.D365_ODATA_CLIENT_SECRET_EXPIRES_AT}
            onChange={handleChange('D365_ODATA_CLIENT_SECRET_EXPIRES_AT')}
          />
        </Field>
      </div>

      <div className={styles.section}>
        <Text weight="semibold" className={styles.sectionTitle}>Cache sync</Text>
        <Text className={styles.hint} block>
          Controls cache limits and freshness. Purchase order filters are managed on the Data model tab.
        </Text>
        <Field label="Max orders per sync (cap)">
          <Input type="number" placeholder="2000" value={form.PO_SYNC_MAX_ORDERS} onChange={handleChange('PO_SYNC_MAX_ORDERS')} />
        </Field>
        <Field label="Cache stale after (minutes)">
          <Input type="number" placeholder="15" value={form.PO_CACHE_STALE_MINUTES} onChange={handleChange('PO_CACHE_STALE_MINUTES')} />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save to database'}
        </Button>
        {feedback && <Text className={styles.feedback}>{feedback}</Text>}
        {error && <Text className={styles.error}>{error}</Text>}
      </div>
    </div>
  );
}
