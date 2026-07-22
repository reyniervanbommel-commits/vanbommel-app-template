import { describe, expect, it } from 'vitest';
import { buildBoardRowSlots } from './purchaseOrderBoardRowSlots';

describe('buildBoardRowSlots', () => {
  it('flattens group headers and entries', () => {
    const slots = buildBoardRowSlots([
      {
        groupKey: 'g1',
        groupName: 'A',
        entries: [{ rowId: 'r1' }, { rowId: 'r2' }],
      },
    ], {});
    expect(slots.map((s) => s.type)).toEqual(['group', 'entry', 'entry']);
  });

  it('skips entries when group is collapsed', () => {
    const slots = buildBoardRowSlots([
      {
        groupKey: 'g1',
        groupName: 'A',
        entries: [{ rowId: 'r1' }],
      },
    ], { g1: true });
    expect(slots).toHaveLength(1);
    expect(slots[0].type).toBe('group');
  });
});
