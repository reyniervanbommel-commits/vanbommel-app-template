'use strict';

/**
 * RCCP-kolomreferenties: optionele master:/detail:-prefix op een tb_columns-key.
 * Zonder prefix blijft het gedrag line-first (detail, daarna master).
 */

function parseRccpColumnRef(stored) {
  const value = String(stored || '').trim();
  if (!value) return { scope: null, key: '' };
  const prefixed = /^(master|detail):([A-Za-z0-9_]+)$/.exec(value);
  if (prefixed) return { scope: prefixed[1], key: prefixed[2] };
  if (/^[A-Za-z0-9_]+$/.test(value)) return { scope: null, key: value };
  return { scope: null, key: '' };
}

function findScopedColumn(columns, storedKey) {
  const { scope, key } = parseRccpColumnRef(storedKey);
  if (!key) return null;
  const matches = (columns || []).filter((col) => col?.key === key);
  if (scope) return matches.find((col) => col.scope === scope) || null;
  return matches.find((col) => col.scope === 'detail') || matches[0] || null;
}

function toScopedColumnKey(storedKey, columns) {
  const value = String(storedKey || '').trim();
  if (!value) return value;
  const col = findScopedColumn(columns, value);
  if (!col?.key) return value;
  const scope = col.scope === 'detail' ? 'detail' : 'master';
  return `${scope}:${col.key}`;
}

function storageColumnKey(storedKey) {
  return parseRccpColumnRef(storedKey).key;
}

module.exports = {
  parseRccpColumnRef,
  findScopedColumn,
  toScopedColumnKey,
  storageColumnKey,
};
