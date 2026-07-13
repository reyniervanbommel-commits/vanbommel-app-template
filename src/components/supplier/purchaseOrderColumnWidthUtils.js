export const DEFAULT_LINE_COLUMN_WIDTH = 160;
export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 1000;

export function resolveLineColumnWidth(columnWidths, columnKey) {
  const width = Number(columnWidths?.[columnKey]);
  if (!Number.isFinite(width)) return DEFAULT_LINE_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}
