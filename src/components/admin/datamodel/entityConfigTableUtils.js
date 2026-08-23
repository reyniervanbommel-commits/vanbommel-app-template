export const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes/no',
  select: 'Choice list',
};

export const BULK_TOGGLE_CONFIG = [
  {
    key: 'visibility',
    label: 'Visible in table',
    isEligible: (column) => column.hideAllowed,
    isEnabled: (column) => column.isActive,
  },
  {
    key: 'visibleAtDelete',
    label: 'Visible at delete',
    isEligible: () => true,
    isEnabled: (column) => column.visibleAtDelete,
  },
  {
    key: 'writeback',
    label: 'Write-back to D365',
    isEligible: (column) => column.writeBackAllowed,
    isEnabled: (column) => column.writableToD365,
  },
];

export function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function matchesText(value, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(value || '').toLowerCase().includes(q);
}

export function toExcelCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function getExampleRowValues(previewRows, d365Fields, sampleByField = {}) {
  for (let i = 0; i < previewRows.length; i += 1) {
    const rowValues = previewRows[i]?.values || {};
    const hasAnyValue = d365Fields.some((field) => (
      rowValues[field] !== null && rowValues[field] !== undefined && rowValues[field] !== ''
    ));
    if (hasAnyValue) return rowValues;
  }
  if (previewRows[0]?.values) return previewRows[0].values;
  const fallback = {};
  for (const field of d365Fields) {
    fallback[field] = sampleByField[field] || '';
  }
  return fallback;
}

export function lookupSampleValue(sampleByField, ...keys) {
  if (!sampleByField || typeof sampleByField !== 'object') return '—';
  for (const key of keys) {
    if (!key) continue;
    const direct = sampleByField[key];
    if (direct !== null && direct !== undefined && direct !== '') return display(direct);
  }
  const wanted = new Set(keys.filter(Boolean).map((key) => String(key).toLowerCase()));
  if (!wanted.size) return '—';
  const entries = Object.entries(sampleByField);
  for (let i = 0; i < entries.length; i += 1) {
    const [field, value] = entries[i];
    if (!wanted.has(String(field).toLowerCase())) continue;
    if (value !== null && value !== undefined && value !== '') return display(value);
  }
  return '—';
}

export function mergeSampleByField(base, extra) {
  const next = { ...(base || {}) };
  const extras = Object.entries(extra || {});
  for (let i = 0; i < extras.length; i += 1) {
    const [key, value] = extras[i];
    if (value === null || value === undefined || value === '' || value === '—') continue;
    const existingKey = Object.keys(next).find((entry) => entry.toLowerCase() === String(key).toLowerCase());
    const target = existingKey || key;
    if (!next[target] || next[target] === '—') next[target] = value;
  }
  return next;
}

export function mergeDiscoverySamples(previewTables, sampleByField) {
  if (!previewTables || !sampleByField) return previewTables;
  return {
    ...previewTables,
    header: previewTables.header
      ? {
        ...previewTables.header,
        sampleByField: mergeSampleByField(previewTables.header.sampleByField, sampleByField.header),
      }
      : previewTables.header,
    line: previewTables.line
      ? {
        ...previewTables.line,
        sampleByField: mergeSampleByField(previewTables.line.sampleByField, sampleByField.line),
      }
      : previewTables.line,
  };
}

export function createSampleByField(preview) {
  if (preview?.sampleByField && typeof preview.sampleByField === 'object') {
    return preview.sampleByField;
  }
  const previewColumns = preview?.columns || [];
  const previewRows = preview?.rows || [];
  const lookup = {};
  for (const field of previewColumns) {
    let bestValue = '—';
    for (let i = 0; i < previewRows.length; i += 1) {
      const candidate = previewRows[i]?.values?.[field];
      if (candidate !== null && candidate !== undefined && candidate !== '') {
        bestValue = display(candidate);
        break;
      }
    }
    lookup[field] = bestValue;
  }
  return lookup;
}
