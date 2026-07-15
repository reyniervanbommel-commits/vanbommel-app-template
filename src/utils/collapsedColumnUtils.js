export const COLLAPSED_COLUMN_WIDTH = 12;

export function normalizeCollapsedColumnKeys(rawKeys, allowedKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) return [];
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length
    ? new Set(allowedKeys)
    : null;
  return Array.from(new Set(
    rawKeys
      .map((key) => String(key || '').trim())
      .filter((key) => key && (!allowed || allowed.has(key)))
  ));
}

export function isColumnCollapsed(columnKey, collapsedKeys) {
  const key = String(columnKey || '').trim();
  if (!key) return false;
  return Array.isArray(collapsedKeys) && collapsedKeys.includes(key);
}

export function applyCollapsedColumnWidths(widths, collapsedKeys) {
  if (!Array.isArray(collapsedKeys) || !collapsedKeys.length) {
    return widths && typeof widths === 'object' ? { ...widths } : {};
  }
  const next = widths && typeof widths === 'object' ? { ...widths } : {};
  collapsedKeys.forEach((key) => {
    next[key] = COLLAPSED_COLUMN_WIDTH;
  });
  return next;
}

export function toggleCollapsedColumnKey(collapsedKeys, columnKey) {
  const key = String(columnKey || '').trim();
  if (!key) return collapsedKeys;
  const current = Array.isArray(collapsedKeys) ? collapsedKeys : [];
  return current.includes(key)
    ? current.filter((entry) => entry !== key)
    : [...current, key];
}
