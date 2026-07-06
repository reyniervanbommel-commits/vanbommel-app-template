export const NEW_COLUMN_TYPES = [
  { key: 'status', label: 'Status', dataType: 'select', options: ['Nieuw', 'Bezig', 'Klaar'] },
  { key: 'text', label: 'Tekst', dataType: 'text' },
  { key: 'number', label: 'Nummers', dataType: 'number' },
  { key: 'date', label: 'Datum', dataType: 'date' },
  { key: 'boolean', label: 'Ja/nee', dataType: 'boolean' },
];

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isDateColumn(column) {
  return column?.dataType === 'date';
}

function getDefaultOperator(column) {
  return isDateColumn(column) ? 'before' : 'contains';
}

export function getDraftFromFilter(column, filter) {
  return {
    operator: filter?.operator || getDefaultOperator(column),
    value: filter?.value || '',
    secondaryValue: filter?.secondaryValue || '',
  };
}

export function getTextStyleDraft(columnTextStyle) {
  const textColor = HEX_COLOR_PATTERN.test(String(columnTextStyle?.textColor || ''))
    ? String(columnTextStyle.textColor).toLowerCase()
    : '';
  return {
    textColor,
    bold: columnTextStyle?.bold === true,
    italic: columnTextStyle?.italic === true,
    underline: columnTextStyle?.underline === true,
  };
}
