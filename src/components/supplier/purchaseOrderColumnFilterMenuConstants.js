import {
  FORMAT_RULE_COLOR_PALETTE,
  FORMAT_RULE_OPERATORS,
  normalizeColumnFormatRuleSet,
} from './columnFormatRuleUtils';

export const NEW_COLUMN_TYPES = [
  { key: 'status', label: 'Status', dataType: 'select', options: ['Nieuw', 'Bezig', 'Klaar'] },
  { key: 'text', label: 'Tekst', dataType: 'text' },
  { key: 'number', label: 'Nummers', dataType: 'number' },
  { key: 'date', label: 'Datum', dataType: 'date' },
  { key: 'boolean', label: 'Ja/nee', dataType: 'boolean' },
  { key: 'image', label: 'Plaatje', dataType: 'image' },
  { key: 'remarks', label: 'Remarks', dataType: 'remarks' },
  { key: 'formula', label: 'Formule', dataType: 'number' },
];

const COLUMN_TYPE_META = {
  connected: { key: 'connected', label: 'Connected' },
  text: { key: 'text', label: 'Text' },
  number: { key: 'number', label: 'Number' },
  date: { key: 'date', label: 'Date' },
  boolean: { key: 'boolean', label: 'Yes/No' },
  select: { key: 'select', label: 'Select' },
  image: { key: 'image', label: 'Image' },
  remarks: { key: 'remarks', label: 'Remarks' },
  formula: { key: 'formula', label: 'Formula' },
};

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function getColumnTypeMeta(column, { isConnected = false } = {}) {
  if (isConnected) return COLUMN_TYPE_META.connected;
  if (String(column?.formulaExpr || '').trim()) return COLUMN_TYPE_META.formula;
  const typeKey = String(column?.dataType || 'text').trim().toLowerCase();
  return COLUMN_TYPE_META[typeKey] || COLUMN_TYPE_META.text;
}

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

export function isColumnFilterActive(column, filter) {
  if (!filter) return false;
  if (isDateColumn(column)) {
    if (filter.operator === 'nextWeek') return true;
    if (filter.operator === 'between') return Boolean(filter.value && filter.secondaryValue);
    if (filter.operator === 'equals' && filter.value === '') return true;
    return Boolean(filter.value);
  }
  if (filter.operator === 'equals' && filter.value === '') return true;
  return Boolean(filter.value);
}

export function isColumnFormatRuleSetActive(columnFormatRuleSet) {
  const normalizedRuleSet = normalizeColumnFormatRuleSet(columnFormatRuleSet);
  return Boolean(normalizedRuleSet?.rules?.length);
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

export function getFormatRulesDraft(columnFormatRuleSet) {
  const normalized = normalizeColumnFormatRuleSet(columnFormatRuleSet);
  if (!normalized) {
    return { target: 'cell', rules: [] };
  }
  return {
    target: normalized.target,
    rules: normalized.rules.map((rule, index) => ({
      id: `rule-${index}`,
      op: FORMAT_RULE_OPERATORS.includes(rule?.op) ? rule.op : '=',
      compareMode: rule?.valueRef ? 'column' : 'value',
      value: rule?.value === undefined || rule?.value === null ? '' : String(rule.value),
      valueRef: String(rule?.valueRef || ''),
      color: String(rule?.color || FORMAT_RULE_COLOR_PALETTE[0]).toLowerCase(),
    })),
  };
}

export function buildFormatRulesDraft() {
  return {
    id: `rule-${Date.now()}`,
    op: '=',
    compareMode: 'value',
    value: '',
    valueRef: '',
    color: FORMAT_RULE_COLOR_PALETTE[0],
  };
}

export function serializeFormatRulesDraft(formatTarget, formatRules) {
  return normalizeColumnFormatRuleSet({
    target: formatTarget,
    rules: (Array.isArray(formatRules) ? formatRules : []).map((rule) => ({
      op: rule.op,
      color: rule.color,
      ...(rule.compareMode === 'column' ? { valueRef: rule.valueRef } : { value: rule.value }),
    })),
  });
}
