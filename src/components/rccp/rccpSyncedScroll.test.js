import { describe, expect, it } from 'vitest';
import { applySyncedScrollLeft } from './rccpSyncedScroll';

function fakeNode(scrollLeft = 0) {
  return { scrollLeft };
}

describe('applySyncedScrollLeft', () => {
  it('copies the source scroll position to the other panes', () => {
    const chart = fakeNode(0);
    const bar = fakeNode(40);
    const matrix = fakeNode(0);
    applySyncedScrollLeft([chart, bar, matrix], bar, 40);
    expect(chart.scrollLeft).toBe(40);
    expect(matrix.scrollLeft).toBe(40);
    expect(bar.scrollLeft).toBe(40);
  });

  it('ignores missing nodes and negative offsets', () => {
    const chart = fakeNode(12);
    applySyncedScrollLeft([chart, null], chart, -8);
    expect(chart.scrollLeft).toBe(12);
  });
});
