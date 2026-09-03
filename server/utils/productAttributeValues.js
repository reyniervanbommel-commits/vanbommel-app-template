'use strict';

const RECORD_KEY_MAX = 128;

function firstNonEmptyString(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    return String(value);
  }
  return '';
}

function attributeNameFromRaw(raw) {
  return firstNonEmptyString([raw?.AttributeName, raw?.Name, raw?.attributeName, raw?.name]);
}

function attributeDisplayValue(raw) {
  return firstNonEmptyString([
    raw?.AttributeValue, raw?.TextValue, raw?.attributeValue, raw?.textValue,
    raw?.IntegerValue, raw?.DecimalValue, raw?.BooleanValue,
    raw?.DateTimeValue, raw?.CurrencyValue,
    raw?.integerValue, raw?.decimalValue, raw?.booleanValue,
    raw?.dateTimeValue, raw?.currencyValue,
  ]);
}

function displayValueFromRecordKey(recordKey) {
  const parts = String(recordKey || '').split('|');
  if (parts.length < 3) return '';
  return parts.slice(2).join('|').trim();
}

function attributeNameFromRecordKey(recordKey) {
  const parts = String(recordKey || '').split('|');
  if (parts.length < 2) return '';
  return String(parts[1] || '').trim();
}

function attributeNameFromCacheRow(row, recordKey) {
  return firstNonEmptyString([
    row?.attributeName,
    row?.AttributeName,
    attributeNameFromRecordKey(recordKey || row?.recordKey || row?.record_key),
  ]);
}

function uniqueAttributeNamesFromCacheRows(rows) {
  const names = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    let parsed = row;
    if (typeof row?.data_json === 'string') {
      try {
        parsed = JSON.parse(row.data_json);
      } catch {
        parsed = {};
      }
    }
    const name = attributeNameFromCacheRow(
      parsed,
      row?.record_key || row?.recordKey || parsed?.recordKey,
    );
    if (name) names.add(name);
  }
  return [...names];
}

function displayValueFromCacheRow(row, recordKey) {
  return firstNonEmptyString([
    attributeDisplayValue(row),
    displayValueFromRecordKey(recordKey),
  ]);
}

function buildPavRecordKey({ productNumber, attributeName, displayValue }) {
  const recordKey = [productNumber, attributeName, displayValue]
    .map((part) => String(part || '').trim())
    .join('|')
    .slice(0, RECORD_KEY_MAX);
  return { partitionKey: 'shared', recordKey };
}

function uniqueSortedValues(values) {
  const unique = [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

function firstValueAndExtra(values) {
  const unique = uniqueSortedValues(values);
  if (!unique.length) return { first: '', additionalCount: 0, allValuesLabel: '' };
  return {
    first: unique[0],
    additionalCount: Math.max(unique.length - 1, 0),
    allValuesLabel: unique.join(', '),
  };
}

function assertNotPavWritable(tableKey, column) {
  if (String(tableKey || '') === 'product-attribute-values') {
    throw Object.assign(new Error('Product attribute values are read-only'), { status: 400 });
  }
  if (column?.options && column.options.kind === 'product-attribute') {
    throw Object.assign(new Error('Product attribute columns are read-only'), { status: 400 });
  }
}

module.exports = {
  attributeNameFromRaw,
  attributeDisplayValue,
  displayValueFromRecordKey,
  attributeNameFromRecordKey,
  attributeNameFromCacheRow,
  uniqueAttributeNamesFromCacheRows,
  displayValueFromCacheRow,
  buildPavRecordKey,
  uniqueSortedValues,
  firstValueAndExtra,
  assertNotPavWritable,
};
