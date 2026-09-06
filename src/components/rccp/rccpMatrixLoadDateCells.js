import { formatMatrixCellValue } from './rccpUtils';
import {
  rccpPlanningDateMarker,
  rccpPlanningDateModeList,
} from './rccpPeriodGrain';

/**
 * Matrix rows whose quantities follow the selected load date (requested / confirmed) and
 * therefore carry an R or C superscript. Capacity and overcapacity are date-mode independent.
 */
export function isRccpLoadDateRow(row) {
  return Boolean(row?.isOrdered || row?.isOpen);
}

/**
 * Cell content for a load-date row: one part per active mode, each with its superscript marker.
 * A mode without a value in this period is left out — with both modes active and only one
 * value present, the cell shows just that value with its own marker.
 *
 * @param {{ requested?: number, confirmed?: number }} values quantity per load-date mode
 * @param {string|string[]|{requested:boolean,confirmed:boolean}} modes active load-date modes
 * @returns {Array<{ mode: string, text: string, marker: string }>}
 */
export function rccpMatrixCellParts(values, modes) {
  const parts = [];
  for (const mode of rccpPlanningDateModeList(modes)) {
    const text = formatMatrixCellValue(values?.[mode], false);
    if (!text) continue;
    parts.push({ mode, text, marker: rccpPlanningDateMarker(mode) });
  }
  return parts;
}

/** Screen-reader text for a load-date cell: "120 requested / 80 confirmed". */
export function rccpMatrixCellAriaValue(parts) {
  if (!parts.length) return '0';
  return parts.map((part) => `${part.text} ${part.mode}`).join(' / ');
}

/** Base font size of a matrix quantity, and the smallest we shrink to. */
const CELL_FONT_MAX = 12;
const CELL_FONT_MIN = 7;
/** Usable width inside one week column (RCCP_WEEK_COL_WIDTH minus cell padding). */
const CELL_TEXT_WIDTH = 46;
/** Rough advance width per character at 1px font size for the semibold cell font. */
const CHAR_WIDTH_RATIO = 0.62;

/**
 * Width of a cell's content in "characters", counting a superscript marker as a narrow one.
 * @param {Array<{ text: string, marker: string }>} parts
 */
export function rccpMatrixCellLength(parts) {
  if (!parts?.length) return 0;
  const separators = parts.length - 1;
  return parts.reduce((sum, part) => sum + String(part.text).length + 0.7, 0) + separators;
}

/**
 * Font size that keeps a quantity inside its week column: full size when it fits, scaled down
 * (never below CELL_FONT_MIN) when it does not.
 * @param {number} length content width in characters
 * @returns {number} font size in px
 */
export function rccpMatrixCellFontSize(length) {
  const chars = Number(length) || 0;
  if (chars <= 0) return CELL_FONT_MAX;
  const fitted = CELL_TEXT_WIDTH / (chars * CHAR_WIDTH_RATIO);
  if (fitted >= CELL_FONT_MAX) return CELL_FONT_MAX;
  return Math.max(CELL_FONT_MIN, Math.floor(fitted));
}
