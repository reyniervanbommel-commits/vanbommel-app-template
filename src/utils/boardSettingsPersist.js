/**
 * Board-settings persist helpers: merge patches onto the latest snapshot, send only
 * changed fields, and serialize overlapping PATCHes so a later column-width/text-style
 * write cannot overwrite a just-saved push-to-header link.
 */

export const PATCH_TO_SNAPSHOT_KEY = {
  nextVisibleKeys: 'visibleColumns',
  nextHeaderOrder: 'columnOrder',
  nextLineOrder: 'lineColumnOrder',
  nextHeaderWidths: 'headerColumnWidths',
  nextLineWidths: 'lineColumnWidths',
  nextHeaderTextStyles: 'headerColumnTextStyles',
  nextHeaderFormatRules: 'headerColumnFormatRules',
  nextLineTextStyles: 'lineColumnTextStyles',
  nextLineFormatRules: 'lineColumnFormatRules',
  nextLineTotalColumns: 'lineTotalColumns',
  nextLineTotalHeaderLinks: 'lineTotalHeaderLinks',
  nextLineValueHeaderLinks: 'lineValueHeaderLinks',
  nextCollapsedHeaderColumnKeys: 'collapsedHeaderColumnKeys',
  nextCollapsedLineColumnKeys: 'collapsedLineColumnKeys',
  nextProductImageColumnVisible: 'productImageColumnVisible',
};

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Map local hook state (visibleColumnKeys) or API/cache settings (visibleColumns)
 * onto the persist snapshot shape.
 *
 * @param {object} local
 * @returns {object}
 */
export function snapshotFromLocalSettings(local = {}) {
  return {
    visibleColumns: Array.isArray(local.visibleColumns)
      ? local.visibleColumns
      : asArray(local.visibleColumnKeys),
    columnOrder: asArray(local.columnOrder),
    lineColumnOrder: asArray(local.lineColumnOrder),
    headerColumnWidths: local.headerColumnWidths && typeof local.headerColumnWidths === 'object'
      ? local.headerColumnWidths
      : {},
    lineColumnWidths: local.lineColumnWidths && typeof local.lineColumnWidths === 'object'
      ? local.lineColumnWidths
      : {},
    headerColumnTextStyles: local.headerColumnTextStyles && typeof local.headerColumnTextStyles === 'object'
      ? local.headerColumnTextStyles
      : {},
    headerColumnFormatRules: local.headerColumnFormatRules && typeof local.headerColumnFormatRules === 'object'
      ? local.headerColumnFormatRules
      : {},
    lineColumnTextStyles: local.lineColumnTextStyles && typeof local.lineColumnTextStyles === 'object'
      ? local.lineColumnTextStyles
      : {},
    lineColumnFormatRules: local.lineColumnFormatRules && typeof local.lineColumnFormatRules === 'object'
      ? local.lineColumnFormatRules
      : {},
    lineTotalColumns: asArray(local.lineTotalColumns),
    lineTotalHeaderLinks: asArray(local.lineTotalHeaderLinks),
    lineValueHeaderLinks: asArray(local.lineValueHeaderLinks),
    collapsedHeaderColumnKeys: asArray(local.collapsedHeaderColumnKeys),
    collapsedLineColumnKeys: asArray(local.collapsedLineColumnKeys),
    productImageColumnVisible: local.productImageColumnVisible !== false,
  };
}

/**
 * Merge a persist patch onto the latest local snapshot.
 * Unspecified fields keep their latest values (empty arrays remain a valid explicit clear).
 *
 * @param {object} latestSnapshot
 * @param {object} patch
 * @returns {object}
 */
export function mergeBoardSettingsPatch(latestSnapshot, patch = {}) {
  const next = { ...(latestSnapshot || {}) };
  Object.entries(PATCH_TO_SNAPSHOT_KEY).forEach(([patchKey, snapshotKey]) => {
    if (hasOwn(patch, patchKey)) next[snapshotKey] = patch[patchKey];
  });
  return next;
}

/**
 * Build a PATCH body with only the keys present in the patch so the server merge
 * keeps unspecified fields (e.g. lineValueHeaderLinks).
 *
 * @param {object} snapshot already merged (and typically normalized)
 * @param {object} patch
 * @returns {object}
 */
export function pickPartialBoardSettings(snapshot, patch = {}) {
  const partial = {};
  Object.entries(PATCH_TO_SNAPSHOT_KEY).forEach(([patchKey, snapshotKey]) => {
    if (hasOwn(patch, patchKey)) partial[snapshotKey] = snapshot?.[snapshotKey];
  });
  return partial;
}

/**
 * Combine a pending coalesced patch with an incoming persist patch.
 * Incoming keys win on conflict.
 *
 * @param {object|null} pending
 * @param {object|null} incoming
 * @returns {object}
 */
export function mergeIncomingPatches(pending, incoming) {
  return { ...(pending || {}), ...(incoming || {}) };
}

/**
 * Serialize async work so a second persist waits until the first PATCH settles.
 *
 * @returns {(task: () => Promise<unknown>) => Promise<unknown>}
 */
export function createPersistQueue() {
  let chain = Promise.resolve();
  return (task) => {
    const next = chain.then(task, task);
    chain = next.then(() => undefined, () => undefined);
    return next;
  };
}
