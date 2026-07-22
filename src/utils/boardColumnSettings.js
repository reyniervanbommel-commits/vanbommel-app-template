// Pure normalisatie- en volgorde-helpers voor board-kolominstellingen
// (zichtbaarheid, volgorde, breedtes, tekststijlen, totals-links).
// Geen React/side effects zodat ze los unit-testbaar zijn.

export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 1000;
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function normalizeVisibleColumns(rawKeys, defaultKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) {
    return defaultKeys;
  }
  const allowed = new Set(defaultKeys);
  const filtered = Array.from(new Set(rawKeys.filter((key) => allowed.has(key))));
  return filtered.length ? filtered : defaultKeys;
}

export function normalizeColumnOrder(rawKeys, defaultKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) {
    return defaultKeys;
  }
  const allowed = new Set(defaultKeys);
  const filtered = Array.from(new Set(rawKeys.filter((key) => allowed.has(key))));
  const missing = defaultKeys.filter((key) => !filtered.includes(key));
  return [...filtered, ...missing];
}

export function arraysEqual(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function normalizeColumnWidths(rawWidths, allowedKeys) {
  if (!rawWidths || typeof rawWidths !== 'object' || Array.isArray(rawWidths)) {
    return {};
  }
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length
    ? new Set(allowedKeys)
    : null;
  return Object.entries(rawWidths).reduce((acc, [rawKey, rawWidth]) => {
    const key = String(rawKey || '').trim();
    if (!key) return acc;
    if (allowed && !allowed.has(key)) return acc;
    const width = Number(rawWidth);
    if (!Number.isFinite(width)) return acc;
    const clamped = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
    acc[key] = clamped;
    return acc;
  }, {});
}

// Zet een losse stijl-invoer om naar een genormaliseerde stijl, of null als er niets overblijft.
export function normalizeColumnTextStyle(rawStyle) {
  if (!rawStyle || typeof rawStyle !== 'object' || Array.isArray(rawStyle)) return null;
  const textColor = HEX_COLOR_PATTERN.test(String(rawStyle.textColor || ''))
    ? String(rawStyle.textColor).toLowerCase()
    : '';
  const bold = rawStyle.bold === true;
  const italic = rawStyle.italic === true;
  const underline = rawStyle.underline === true;
  if (!textColor && !bold && !italic && !underline) return null;
  const style = {};
  if (textColor) style.textColor = textColor;
  if (bold) style.bold = true;
  if (italic) style.italic = true;
  if (underline) style.underline = true;
  return style;
}

// Vlakke gelijkheid voor genormaliseerde stijl-objecten (alleen primitieve velden).
function columnTextStyleEquals(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.textColor === right.textColor
    && left.bold === right.bold
    && left.italic === right.italic
    && left.underline === right.underline;
}

// `previous` (optioneel): behoud de referentie van ongewijzigde kolom-entries zodat een wijziging
// aan één kolom niet de identiteit van álle andere kolom-stijlen breekt. Dat houdt React.memo op
// board-cellen van niet-gewijzigde kolommen intact (perf: BL-006 bold-toggle re-render).
export function normalizeColumnTextStyleMap(rawStyles, allowedKeys, previous = null) {
  if (!rawStyles || typeof rawStyles !== 'object' || Array.isArray(rawStyles)) {
    return {};
  }
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length
    ? new Set(allowedKeys)
    : null;
  const prev = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : null;
  return Object.entries(rawStyles).reduce((acc, [rawKey, rawStyle]) => {
    const key = String(rawKey || '').trim();
    if (!key) return acc;
    if (allowed && !allowed.has(key)) return acc;
    const style = normalizeColumnTextStyle(rawStyle);
    if (!style) return acc;
    acc[key] = prev && columnTextStyleEquals(prev[key], style) ? prev[key] : style;
    return acc;
  }, {});
}

// Combineert de huidige stijl met een patch (undefined in de patch = huidige waarde behouden).
// Retourneert null als er na de merge geen actieve stijl overblijft.
export function mergeColumnTextStyle(current = {}, stylePatch = {}) {
  return normalizeColumnTextStyle({
    textColor: stylePatch?.textColor !== undefined ? stylePatch.textColor : current.textColor,
    bold: stylePatch?.bold !== undefined ? stylePatch.bold === true : current.bold === true,
    italic: stylePatch?.italic !== undefined ? stylePatch.italic === true : current.italic === true,
    underline: stylePatch?.underline !== undefined ? stylePatch.underline === true : current.underline === true,
  });
}

export function normalizeSelectedColumns(rawKeys, allowedKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) return [];
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length ? new Set(allowedKeys) : null;
  const unique = Array.from(new Set(rawKeys.map((key) => String(key || '').trim()).filter(Boolean)));
  return allowed ? unique.filter((key) => allowed.has(key)) : unique;
}

export function normalizeLineTotalLinks(rawLinks, allowedLineKeys, allowedHeaderKeys) {
  if (!Array.isArray(rawLinks) || !rawLinks.length) return [];
  const allowedLineSet = Array.isArray(allowedLineKeys) && allowedLineKeys.length
    ? new Set(allowedLineKeys)
    : null;
  const allowedHeaderSet = Array.isArray(allowedHeaderKeys) && allowedHeaderKeys.length
    ? new Set(allowedHeaderKeys)
    : null;
  const seen = new Set();
  return rawLinks.reduce((acc, entry) => {
    if (!entry || typeof entry !== 'object') return acc;
    const lineColumnKey = String(entry.lineColumnKey || '').trim();
    const headerColumnKey = String(entry.headerColumnKey || '').trim();
    if (!lineColumnKey || !headerColumnKey) return acc;
    if (allowedLineSet && !allowedLineSet.has(lineColumnKey)) return acc;
    if (allowedHeaderSet && !allowedHeaderSet.has(headerColumnKey)) return acc;
    const signature = `${lineColumnKey}|${headerColumnKey}`;
    if (seen.has(signature)) return acc;
    seen.add(signature);
    acc.push({ lineColumnKey, headerColumnKey });
    return acc;
  }, []);
}

// Verplaatst sourceKey vóór/na targetKey binnen de subset van movableKeys, terwijl
// niet-verplaatsbare (bv. verborgen) kolommen op hun relatieve positie blijven staan.
export function moveColumnKey(rawOrder, defaultKeys, sourceKey, targetKey, position = 'before', movableKeys = defaultKeys) {
  const order = normalizeColumnOrder(rawOrder, defaultKeys);
  const allowedSet = new Set(Array.isArray(movableKeys) && movableKeys.length ? movableKeys : defaultKeys);
  const movableOrder = order.filter((key) => allowedSet.has(key));
  const sourceIndex = movableOrder.indexOf(sourceKey);
  const targetIndex = movableOrder.indexOf(targetKey);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return order;

  const nextMovableOrder = [...movableOrder];
  const [movedKey] = nextMovableOrder.splice(sourceIndex, 1);
  const normalizedPosition = position === 'after' ? 'after' : 'before';
  const nextTargetIndex = nextMovableOrder.indexOf(targetKey);
  if (nextTargetIndex === -1) return order;
  const insertAt = normalizedPosition === 'after' ? nextTargetIndex + 1 : nextTargetIndex;
  nextMovableOrder.splice(insertAt, 0, movedKey);

  let movableIndex = 0;
  return order.map((key) => {
    if (!allowedSet.has(key)) return key;
    const replacement = nextMovableOrder[movableIndex];
    movableIndex += 1;
    return replacement;
  });
}
