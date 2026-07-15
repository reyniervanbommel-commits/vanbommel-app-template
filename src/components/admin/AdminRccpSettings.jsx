import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Save24Regular, Warning24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

const useStyles = makeStyles({
  root: { maxWidth: '820px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', ...shorthands.gap('12px') },
  hint: { color: tokens.colorNeutralForeground3 },
  warn: { display: 'flex', alignItems: 'flex-start', ...shorthands.gap('8px'), color: tokens.colorPaletteDarkOrangeForeground1 },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px') },
});

const PO_TABLE = 'purchase-orders';

function ColumnSelect({ label, value, onChange, columns, hint }) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {columns.map((col) => (
          <option key={`${col.scope}-${col.key}`} value={col.key}>{col.label || col.key}</option>
        ))}
      </Select>
    </Field>
  );
}

export default function AdminRccpSettings() {
  const styles = useStyles();
  const [config, setConfig] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [categoryChanged, setCategoryChanged] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [settings, masterCols, detailCols] = await Promise.all([
          apiRequest('/admin/rccp/settings'),
          apiRequest(`/data/${PO_TABLE}/columns?scope=master`),
          apiRequest(`/data/${PO_TABLE}/columns?scope=detail`),
        ]);
        if (!active) return;
        setConfig(settings.config);
        setColumns([
          ...(masterCols.columns || []).map((c) => ({ ...c, scope: 'master' })),
          ...(detailCols.columns || []).map((c) => ({ ...c, scope: 'detail' })),
        ]);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load RCCP settings');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const updateField = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (field === 'categoryColumnKey') setCategoryChanged(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await apiRequest('/admin/rccp/settings', { method: 'PUT', body: config });
      setConfig(result.config);
      setCategoryChanged(false);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Failed to save RCCP settings');
    } finally {
      setSaving(false);
    }
  }, [config]);

  const statusOptions = useMemo(() => {
    const statusCol = columns.find((c) => c.key === 'status' || c.key === 'purchaseOrderStatus');
    const options = statusCol?.options || [];
    return Array.isArray(options) ? options : [];
  }, [columns]);

  if (loading) return <Spinner label="Loading RCCP settings..." />;
  if (!config) return <Text className={styles.hint}>{error || 'No settings available'}</Text>;

  return (
    <div className={styles.root}>
      <Text size={600} weight="semibold">RCCP settings</Text>
      <Text className={styles.hint}>
        Configure which purchase order columns drive live RCCP load calculation.
      </Text>

      {categoryChanged && (
        <div className={styles.warn}>
          <Warning24Regular />
          <Text size={200}>
            Changing the category column keeps existing capacity rows on their old category values.
          </Text>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.grid}>
          <ColumnSelect
            label="Vendor column"
            value={config.vendorColumnKey}
            onChange={(v) => updateField('vendorColumnKey', v)}
            columns={columns.filter((c) => c.scope === 'master')}
          />
          <ColumnSelect
            label="Date column"
            hint="Line value falls back to order header when empty."
            value={config.dateColumnKey}
            onChange={(v) => updateField('dateColumnKey', v)}
            columns={columns}
          />
          <ColumnSelect
            label="Quantity column"
            value={config.quantityColumnKey}
            onChange={(v) => updateField('quantityColumnKey', v)}
            columns={columns}
          />
          <ColumnSelect
            label="Category column"
            value={config.categoryColumnKey}
            onChange={(v) => updateField('categoryColumnKey', v)}
            columns={columns}
          />
        </div>
      </div>

      <div className={styles.section}>
        <Field label="Excluded PO statuses" hint="Comma-separated status labels to ignore in load calculation.">
          <Input
            value={(config.excludedStatuses || []).join(', ')}
            onChange={(e) => updateField('excludedStatuses', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
        {statusOptions.length > 0 && (
          <Text size={200} className={styles.hint}>Known statuses: {statusOptions.join(', ')}</Text>
        )}
        <div className={styles.grid}>
          <Field label="Green threshold (%)">
            <Input
              type="number"
              value={String(config.thresholds?.greenMax ?? 80)}
              onChange={(e) => updateField('thresholds', { ...config.thresholds, greenMax: Number(e.target.value) })}
            />
          </Field>
          <Field label="Orange threshold (%)">
            <Input
              type="number"
              value={String(config.thresholds?.orangeMax ?? 100)}
              onChange={(e) => updateField('thresholds', { ...config.thresholds, orangeMax: Number(e.target.value) })}
            />
          </Field>
          <Field label="Duplicate import policy">
            <Select
              value={config.duplicatePolicy || 'update'}
              onChange={(e) => updateField('duplicatePolicy', e.target.value)}
            >
              <option value="update">Update existing rows</option>
              <option value="skip">Skip duplicates</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          Save settings
        </Button>
        {saving && <Spinner size="tiny" />}
        {saved && <Text className={styles.hint}>Saved</Text>}
        {error && <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text>}
      </div>
    </div>
  );
}
