/**
 * Flatten grouped board rows into fixed-height slots for viewport windowing.
 * Each group header and each visible entry is one slot (32px).
 */
export function buildBoardRowSlots(groupedRows, collapsedGroups = {}) {
  const slots = [];
  for (const group of groupedRows || []) {
    const groupKey = group.groupKey || group.groupName;
    if (group.ancestorGroupKeys?.some((key) => collapsedGroups[key])) continue;
    slots.push({ type: 'group', group, groupKey });
    if (collapsedGroups[groupKey]) continue;
    for (const entry of group.entries || []) {
      slots.push({ type: 'entry', group, groupKey, entry });
    }
  }
  return slots;
}

/**
 * Collects the slot indices of every group-header slot, in ascending order.
 * Used to look up the "active" category header without scanning all slots.
 */
export function collectGroupSlotIndices(slots) {
  const indices = [];
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index]?.type === 'group') indices.push(index);
  }
  return indices;
}

/**
 * Finds the slot index of the group header that is active at (i.e. the closest
 * group header at or before) the given slot position. Binary search over the
 * precomputed group indices — cheap even for boards with many rows, since the
 * number of groups is typically far smaller than the number of rows.
 * Returns -1 when there is no group header at or before that position.
 */
export function findActiveGroupSlotIndex(groupSlotIndices, position) {
  let low = 0;
  let high = groupSlotIndices.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (groupSlotIndices[mid] <= position) {
      result = groupSlotIndices[mid];
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}
