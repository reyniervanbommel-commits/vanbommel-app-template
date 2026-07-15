import React, { useCallback, useEffect, useState } from 'react';
import { Field, Select, Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { apiRequest } from '../../utils/api';

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '420px',
  },
  hint: { color: tokens.colorNeutralForeground3 },
});

/**
 * Laat de admin kiezen op welke purchase-orders master-kolom het supplier-filter matcht.
 * Haalt de beschikbare kolommen en de huidige instelling op en slaat wijzigingen direct op.
 */
export default function SupplierFilterColumnSelect() {
  const styles = useStyles();
  const [columns, setColumns] = useState([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [colData, setting] = await Promise.all([
          apiRequest('/data/purchase-orders/columns?scope=master'),
          apiRequest('/admin/supplier-filter-column'),
        ]);
        if (!active) return;
        setColumns(Array.isArray(colData?.columns) ? colData.columns : []);
        setValue(setting?.columnKey || 'vendorAccount');
      } catch {
        if (active) setColumns([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleChange = useCallback(async (event) => {
    const columnKey = event.target.value;
    setValue(columnKey);
    setSaving(true);
    setSaved(false);
    try {
      await apiRequest('/admin/supplier-filter-column', { method: 'PUT', body: { columnKey } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) return <Spinner size="tiny" label="Loading filter setting..." />;

  return (
    <div className={styles.wrap}>
      <Field
        label="Filter supplier orders by column"
        hint="Suppliers only see orders where this column matches their vendor account."
        style={{ flex: 1 }}
      >
        <Select value={value} onChange={handleChange} disabled={saving}>
          {columns.map((col) => (
            <option key={col.key} value={col.key}>{col.label || col.key}</option>
          ))}
        </Select>
      </Field>
      {saving && <Spinner size="tiny" />}
      {saved && <Text size={200} className={styles.hint}>Saved</Text>}
    </div>
  );
}
