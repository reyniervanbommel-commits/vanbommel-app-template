'use strict';

/**
 * trackChangeMarks — server-only pure helpers voor de "track changes"-stippen.
 *
 * De client krijgt kant-en-klare 8-tekenstrings (r/g/y) + een per-kolom defaultPattern,
 * en heeft dus zelf geen pattern-logica nodig.
 *
 * Offset-conventie: offset 0 = de lopende/huidige sessie of week (meest rechtse slot),
 * hogere offsets = verder terug in de tijd (naar links).
 */

const MARK_COUNT = 8;

/**
 * Bouwt een tekenstring van stip-kleuren (r/g/y), één teken per bucket.
 *
 * @param {number[]} redOffsets - offsets (0..max-1) waarin de cel gewijzigd is (rood).
 * @param {number} activeOffset - per-kolom index waarop 'afgerond' (geel) omslaat naar
 *   'vóór activatie' (grijs). Alles met offset > activeOffset is grijs.
 * @param {number} [max=MARK_COUNT] - aantal stippen.
 * @returns {string} bv. "gyyrg" — index 0 = meest linkse (oudste) slot.
 */
function buildMarkPattern(redOffsets, activeOffset, max = MARK_COUNT) {
  const red = new Set(Array.isArray(redOffsets) ? redOffsets : []);
  const marks = new Array(max).fill('g');
  const safeActiveOffset = Number.isFinite(activeOffset) ? activeOffset : max - 1;
  for (let offset = 0; offset < max; offset += 1) {
    const slot = max - 1 - offset; // offset 0 = meest rechtse slot
    if (red.has(offset)) marks[slot] = 'r';
    else if (offset === 0) marks[slot] = 'g'; // lopende sessie/week
    else if (offset <= safeActiveOffset) marks[slot] = 'y'; // afgeronde sessie/week zonder wijziging
    else marks[slot] = 'g'; // vóór activatie/tracking → grijs
  }
  return marks.join('');
}

module.exports = { MARK_COUNT, buildMarkPattern };
