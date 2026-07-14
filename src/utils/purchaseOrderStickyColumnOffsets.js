import { PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX } from '../components/supplier/purchaseOrderBoardLayout';

const FALLBACK_COLUMN_WIDTH = 80;

function pickColumnWidth(columnKey, explicitWidths, measuredWidths) {
  const explicit = Number(explicitWidths?.[columnKey]);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const measured = Number(measuredWidths?.[columnKey]);
  if (Number.isFinite(measured) && measured > 0) return measured;
  return FALLBACK_COLUMN_WIDTH;
}

/** Fallback offsets when the table header is not mounted yet. */
export function computeStickyOffsetsFromWidths(stickyColumnKeys, headerColumnWidths, measuredWidths = {}) {
  const offsets = {};
  let left = PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX;
  stickyColumnKeys.forEach((key) => {
    offsets[key] = left;
    left += pickColumnWidth(key, headerColumnWidths, measuredWidths);
  });
  return offsets;
}

/**
 * Read sticky left offsets from rendered header cells.
 * offsetLeft matches the browser layout position when scrollLeft is 0.
 */
export function measureStickyOffsetsFromTable(table, stickyColumnKeys) {
  const thead = table?.querySelector?.('thead');
  if (!thead || !stickyColumnKeys.length) return null;

  const offsets = {};
  for (const key of stickyColumnKeys) {
    const headerCell = thead.querySelector(`[data-col-key="${key}"]`);
    if (!headerCell) return null;
    const nextLeft = Math.round(headerCell.offsetLeft);
    if (!Number.isFinite(nextLeft) || nextLeft < 0) return null;
    offsets[key] = nextLeft;
  }
  return offsets;
}

export function areStickyOffsetsComplete(offsets, stickyColumnKeys) {
  return stickyColumnKeys.length > 0
    && stickyColumnKeys.every((key) => Number.isFinite(offsets?.[key]));
}
