import { describe, expect, it } from 'vitest';
import {
  buildBoardRowSlots,
  collectGroupSlotIndices,
  findActiveGroupSlotIndex,
} from './purchaseOrderBoardRowSlots';

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

describe('collectGroupSlotIndices', () => {
  it('returns the ascending indices of every group-header slot', () => {
    const slots = buildBoardRowSlots([
      { groupKey: 'g1', groupName: 'A', entries: [{ rowId: 'r1' }, { rowId: 'r2' }] },
      { groupKey: 'g2', groupName: 'B', entries: [{ rowId: 'r3' }] },
    ], {});
    // slot 0 = group A, 1-2 = entries, 3 = group B, 4 = entry
    expect(collectGroupSlotIndices(slots)).toEqual([0, 3]);
  });

  it('returns an empty array when there are no groups', () => {
    expect(collectGroupSlotIndices([])).toEqual([]);
  });
});

describe('findActiveGroupSlotIndex', () => {
  const groupSlotIndices = [0, 3, 10];

  it('finds the group header at the exact position', () => {
    expect(findActiveGroupSlotIndex(groupSlotIndices, 3)).toBe(3);
  });

  it('finds the closest preceding group header when scrolled past it', () => {
    expect(findActiveGroupSlotIndex(groupSlotIndices, 7)).toBe(3);
    expect(findActiveGroupSlotIndex(groupSlotIndices, 25)).toBe(10);
  });

  it('returns -1 when the position is before the first group header', () => {
    expect(findActiveGroupSlotIndex([5, 10], 2)).toBe(-1);
  });

  it('returns -1 when there are no group headers at all', () => {
    expect(findActiveGroupSlotIndex([], 5)).toBe(-1);
  });
});
