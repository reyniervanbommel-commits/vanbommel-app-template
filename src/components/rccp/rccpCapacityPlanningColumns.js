export const CAPACITY_PLANNING_COLUMNS = [
  { key: 'vendorAccount', label: 'VendorCode', align: 'left', type: 'text' },
  { key: 'periodYear', label: 'Year', align: 'right', type: 'number' },
  { key: 'isoWeek', label: 'ISOWeek', align: 'right', type: 'number' },
  { key: 'capacityCategory', label: 'CapacityCategory', align: 'left', type: 'text' },
  { key: 'availableQty', label: 'CapacityQuantity', align: 'right', type: 'number' },
];

export const EMPTY_CAPACITY_FILTERS = CAPACITY_PLANNING_COLUMNS.reduce((acc, column) => {
  acc[column.key] = '';
  return acc;
}, {});

export function getCapacityCellValue(row, key) {
  const value = row?.[key];
  if (value === null || value === undefined) return '';
  return String(value);
}

export function rowMatchesCapacityFilters(row, filters) {
  return CAPACITY_PLANNING_COLUMNS.every((column) => {
    const needle = String(filters[column.key] || '').trim().toLowerCase();
    if (!needle) return true;
    return getCapacityCellValue(row, column.key).toLowerCase().includes(needle);
  });
}

export function sortCapacityRows(rows, sortKey, direction) {
  if (!sortKey) return rows;

  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = getCapacityCellValue(left, sortKey);
    const b = getCapacityCellValue(right, sortKey);
    const aNum = Number(a);
    const bNum = Number(b);
    if (a !== '' && b !== '' && Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return (aNum - bNum) * factor;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) * factor;
  });
}

export function hasActiveCapacityFilters(filters) {
  return Object.values(filters).some((value) => String(value || '').trim());
}

export function isCapacityColumnFilterActive(filters, key) {
  return Boolean(String(filters?.[key] || '').trim());
}

const COLUMN_FONT = '400 14px "Segoe UI", system-ui, sans-serif';
const CELL_PADDING_X = 20;
const HEADER_PADDING_X = 20;
const HEADER_MENU_WIDTH = 28;
const CHAR_WIDTH_ESTIMATE = 8.1;

const COLUMN_MIN_WIDTHS = {
  vendorAccount: 72,
  periodYear: 52,
  isoWeek: 44,
  capacityCategory: 80,
  availableQty: 64,
};

function measureTextWidth(text, measureCtx) {
  const value = String(text ?? '');
  if (!value) return 0;
  if (measureCtx) {
    return measureCtx.measureText(value).width;
  }
  return value.length * CHAR_WIDTH_ESTIMATE;
}

/**
 * Column width follows the widest cell value (+ padding). Header labels ellipsis if narrower.
 */
export function computeCapacityColumnWidths(rows, measureCtx = null) {
  const ctx = measureCtx || (typeof document !== 'undefined'
    ? (() => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) context.font = COLUMN_FONT;
      return context;
    })()
    : null);

  const headerMin = HEADER_PADDING_X + HEADER_MENU_WIDTH + 16;
  const widths = {};
  for (const column of CAPACITY_PLANNING_COLUMNS) {
    let maxCell = 0;
    for (const row of rows) {
      maxCell = Math.max(maxCell, measureTextWidth(getCapacityCellValue(row, column.key), ctx));
    }
    widths[column.key] = Math.max(
      COLUMN_MIN_WIDTHS[column.key] || 48,
      headerMin,
      Math.ceil(maxCell + CELL_PADDING_X),
    );
  }
  return widths;
}
