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

export function getExampleRowValues(previewRows, d365Fields) {
  for (let i = 0; i < previewRows.length; i += 1) {
    const rowValues = previewRows[i]?.values || {};
    const hasAnyValue = d365Fields.some((field) => (
      rowValues[field] !== null && rowValues[field] !== undefined && rowValues[field] !== ''
    ));
    if (hasAnyValue) return rowValues;
  }
  return previewRows[0]?.values || {};
}

export function createSampleByField(preview) {
  const previewColumns = preview?.columns || [];
  const previewRows = preview?.rows || [];
  return previewColumns.reduce((lookup, field) => {
    let bestValue = '—';
    for (let i = 0; i < previewRows.length; i += 1) {
      const candidate = previewRows[i]?.values?.[field];
      if (candidate !== null && candidate !== undefined && candidate !== '') {
        bestValue = display(candidate);
        break;
      }
    }
    return { ...lookup, [field]: bestValue };
  }, {});
}
