/** Fixed item palette — never includes late-red `#D13438`. */
export const RCCP_ITEM_PALETTE = [
  '#0078D4',
  '#8764B8',
  '#CA5010',
  '#107C10',
  '#5C2D91',
  '#00B7C3',
  '#4F6BED',
  '#8E562E',
];

function hashItemNumber(itemNumber) {
  const text = String(itemNumber || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Stable hex for an item number. Skips `openColor` when it is in the palette.
 * @param {string} itemNumber
 * @param {{ openColor?: string }} [opts]
 */
export function rccpItemColor(itemNumber, { openColor } = {}) {
  const skip = String(openColor || '').toLowerCase();
  const palette = RCCP_ITEM_PALETTE.filter((color) => color.toLowerCase() !== skip);
  const list = palette.length ? palette : RCCP_ITEM_PALETTE;
  return list[hashItemNumber(itemNumber) % list.length];
}
