import { describe, expect, it } from 'vitest';
import { poTableZoomedPx } from './poTableZoom';
import {
  CELL_HISTORY_FOLD_SIZE,
  cellHistoryFoldPaperClip,
  cellHistoryFoldShadowClip,
} from './cellHistoryFold';

describe('cellHistoryFold', () => {
  it('scales the fold with table zoom', () => {
    expect(CELL_HISTORY_FOLD_SIZE).toBe(poTableZoomedPx(10));
    expect(CELL_HISTORY_FOLD_SIZE).toContain('--po-table-zoom');
  });

  it('uses zoomed lengths in clip-path so the triangles stay visible', () => {
    const size = CELL_HISTORY_FOLD_SIZE;
    expect(cellHistoryFoldShadowClip()).toBe(`polygon(0 0, 0 ${size}, ${size} ${size})`);
    expect(cellHistoryFoldPaperClip()).toBe(`polygon(0 0, ${size} 0, ${size} ${size})`);
    expect(cellHistoryFoldShadowClip()).not.toMatch(/100%/);
    expect(cellHistoryFoldPaperClip()).not.toMatch(/100%/);
  });
});
