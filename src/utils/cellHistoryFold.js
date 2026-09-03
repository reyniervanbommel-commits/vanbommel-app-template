import { poTableZoomedPx } from './poTableZoom';

/** Pixel size of the cell-history fold before zoom; clip-path must use this same calc. */
export const CELL_HISTORY_FOLD_SIZE = poTableZoomedPx(10);

/**
 * Shadow triangle (lower-left half). Lengths, not percentages: Chromium
 * resolves `polygon(... 100% ...)` against a 0×0 box when width/height is calc(zoom).
 */
export function cellHistoryFoldShadowClip() {
  const size = CELL_HISTORY_FOLD_SIZE;
  return `polygon(0 0, 0 ${size}, ${size} ${size})`;
}

/** Paper triangle (upper-right half). */
export function cellHistoryFoldPaperClip() {
  const size = CELL_HISTORY_FOLD_SIZE;
  return `polygon(0 0, ${size} 0, ${size} ${size})`;
}
