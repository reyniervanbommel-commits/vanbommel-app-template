import { useCallback, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

// Enum-metadata voor D365-velden die geen vrije tekst zijn. De Status-kolom gebruikt
// de PurchStatus-enum; OData vereist daarvoor de notatie EnumType'Member'.
export const ENUM_FIELDS = {
  PurchaseOrderStatus: {
    enumType: 'PurchStatus',
    members: ['None', 'Backorder', 'Received', 'Invoiced', 'Canceled'],
  },
};

// Lichtgewicht client-preview van wat de server compileert (zie server/utils/odataSyncFilter.js).
function previewRule(rule) {
  const { field, operator, value, valueType, enumType } = rule;
  if (!field || !operator || value === '' || value === null || value === undefined) return null;
  if (valueType === 'enum') return `${field} ${operator} Microsoft.Dynamics.DataEntities.${enumType}'${value}'`;
  if (valueType === 'number') return `${field} ${operator} ${value}`;
  if (valueType === 'date') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : `${field} ${operator} ${parsed.toISOString()}`;
  }
  const escaped = String(value).replace(/'/g, "''");
  if (operator === 'contains') return `contains(${field},'${escaped}')`;
  return `${field} ${operator} '${escaped}'`;
}

// Bepaalt het waardetype van een regel op basis van de gekozen kolom.
export function valueTypeForColumn(column) {
  if (column?.d365Field && ENUM_FIELDS[column.d365Field]) return 'enum';
  if (column?.dataType === 'date') return 'date';
  if (column?.dataType === 'number') return 'number';
  return 'text';
}

/**
 * Beheert de gestructureerde D365-syncfilterregels (admin): lokale bewerking,
 * live OData-preview en opslaan via PUT /purchase-orders/sync-filters.
 *
 * Input: initialRules (uit het datamodel-endpoint)
 * Output: { rules, preview, addRule, updateRule, removeRule, save, saving, error, savedAt }
 */
export function useSyncFilters(initialRules) {
  const [rules, setRules] = useState(() => (Array.isArray(initialRules) ? initialRules : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  const addRule = useCallback((defaults) => {
    setRules((prev) => [...prev, { field: '', operator: 'eq', value: '', valueType: 'text', ...defaults }]);
    setSavedAt(null);
  }, []);

  const updateRule = useCallback((index, patch) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    setSavedAt(null);
  }, []);

  const removeRule = useCallback((index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setSavedAt(null);
  }, []);

  const preview = useMemo(
    () => rules.map(previewRule).filter(Boolean).join(' and '),
    [rules]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await apiRequest('/purchase-orders/sync-filters', { method: 'PUT', body: { rules } });
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [rules]);

  return useMemo(() => ({
    rules,
    preview,
    addRule,
    updateRule,
    removeRule,
    save,
    saving,
    error,
    savedAt,
  }), [rules, preview, addRule, updateRule, removeRule, save, saving, error, savedAt]);
}
