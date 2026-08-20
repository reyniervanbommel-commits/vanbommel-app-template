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
import AdminInfoHint from './AdminInfoHint';
import { ODATA_SETTINGS_INFO } from './odataSettingsInfoCopy';

const useStyles = makeStyles({
  root: { maxWidth: '720px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  pageHeader: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
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
  sectionTitleRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
  statusGrid: { display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  statusRow: { display: 'flex', ...shorthands.gap('8px'), alignItems: 'center', flexWrap: 'wrap' },
  statusLabel: { color: tokens.colorNeutralForeground3, minWidth: '170px', fontSize: tokens.fontSizeBase200 },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', flexWrap: 'wrap' },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

const AUTH_LABELS = {
  oauth_client_credentials: { label: 'OAuth2 client credentials', color: 'success' },
  static_bearer_token: { label: 'Legacy bearer token', color: 'warning' },
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
  PO_SYNC_RETAINED_MAX_AUTO: '',
  PO_CACHE_STALE_MINUTES: '',
};

const EXPIRY_BADGE = {
  expired: { color: 'danger', label: 'Expired' },
  warning: { color: 'warning', label: 'Expires soon' },
  ok: { color: 'success', label: 'Valid' },
  unknown: { color: 'informative', label: 'Not set' },
};

const toDateInputValue = (raw) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

function SectionTitle({ title, info, infoLabel }) {
  const styles = useStyles();
  return (
    <div className={styles.sectionTitleRow}>
      <Text weight="semibold">{title}</Text>
      <AdminInfoHint text={info} label={infoLabel} />
    </div>
  );
}

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
      setSecretSet({ clientSecret: !!s.D365_ODATA_CLIENT_SECRET_SET });
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
        PO_SYNC_RETAINED_MAX_AUTO: s.PO_SYNC_RETAINED_MAX_AUTO || '2000',
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
      <div>
        <div className={styles.pageHeader}>
          <Text size={600} weight="semibold">OData connection (D365)</Text>
          <AdminInfoHint text={ODATA_SETTINGS_INFO.page} label="About the OData page" />
        </div>
        <Text className={styles.dbHint} block>
          Saved in SQL table dbo.{dbSource}. Filters and columns: Data model tab.
        </Text>
      </div>

      <div className={styles.section}>
        <Text weight="semibold">Current status</Text>
        <div className={styles.statusGrid}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Authentication</span>
            <Badge appearance="tint" color={auth.color}>{auth.label}</Badge>
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
            {expiry.expiresAt ? (
              <span className={styles.hint}>
                {toDateInputValue(expiry.expiresAt)}
                {typeof expiry.daysRemaining === 'number' && expiry.daysRemaining > 0
                  ? ` — ${expiry.daysRemaining} days left`
                  : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <SectionTitle title="Connection" info={ODATA_SETTINGS_INFO.connection} infoLabel="About connection" />
        <Field label="OData base URL" hint="D365 environment URL from LCS or Help → About.">
          <Input
            placeholder="https://vanbommel-acc.sandbox.operations.dynamics.com"
            value={form.D365_ODATA_BASE_URL}
            onChange={handleChange('D365_ODATA_BASE_URL')}
          />
        </Field>
        <Field label="Purchase order headers path (entity)" hint="Header entity. Lines load via $expand.">
          <Input
            placeholder="/data/PurchaseOrderHeadersV2"
            value={form.D365_ODATA_PURCHASE_ORDERS_PATH}
            onChange={handleChange('D365_ODATA_PURCHASE_ORDERS_PATH')}
          />
        </Field>
        <Field label="Company code" hint="Legal entity (dataAreaId).">
          <Input placeholder="WHSL" value={form.D365_ODATA_COMPANY} onChange={handleChange('D365_ODATA_COMPANY')} />
        </Field>
        <Field label="Timeout (ms)" hint="Maximum wait per OData request.">
          <Input type="number" placeholder="20000" value={form.D365_ODATA_TIMEOUT_MS} onChange={handleChange('D365_ODATA_TIMEOUT_MS')} />
        </Field>
      </div>

      <div className={styles.section}>
        <SectionTitle
          title="Authentication — OAuth2 client credentials"
          info={ODATA_SETTINGS_INFO.authentication}
          infoLabel="About authentication"
        />
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
          hint="Admins are warned from 30 days before this date. Update it when you rotate the secret."
        >
          <Input type="date" value={form.D365_ODATA_CLIENT_SECRET_EXPIRES_AT} onChange={handleChange('D365_ODATA_CLIENT_SECRET_EXPIRES_AT')} />
        </Field>
      </div>

      <div className={styles.section}>
        <SectionTitle title="Cache sync" info={ODATA_SETTINGS_INFO.cache} infoLabel="About cache sync" />
        <Field label="Max orders per sync (cap)" hint="Safety cap on the filtered D365 fetch.">
          <Input type="number" placeholder="2000" value={form.PO_SYNC_MAX_ORDERS} onChange={handleChange('PO_SYNC_MAX_ORDERS')} />
        </Field>
        <Field
          label="Max retained orders"
          hint="Orders that leave the Data model filter stay on the board and are re-fetched by key. Warning levels follow this limit. Maximum 10,000."
        >
          <Input type="number" min="1" max="10000" placeholder="2000" value={form.PO_SYNC_RETAINED_MAX_AUTO} onChange={handleChange('PO_SYNC_RETAINED_MAX_AUTO')} />
        </Field>
        <Field label="Cache stale after (minutes)" hint="How long the cache may sit before the board treats it as out of date.">
          <Input type="number" placeholder="15" value={form.PO_CACHE_STALE_MINUTES} onChange={handleChange('PO_CACHE_STALE_MINUTES')} />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save to database'}
        </Button>
        {feedback ? <Text className={styles.feedback}>{feedback}</Text> : null}
        {error ? <Text className={styles.error}>{error}</Text> : null}
      </div>
    </div>
  );
}
