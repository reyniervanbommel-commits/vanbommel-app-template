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
