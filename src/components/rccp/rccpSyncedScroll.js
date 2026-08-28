/** Keep several overflow panes on the same horizontal scroll position. */
export function applySyncedScrollLeft(nodes, source, left) {
  const value = Math.max(0, Number(left) || 0);
  (nodes || []).forEach((node) => {
    if (node && node !== source && node.scrollLeft !== value) {
      node.scrollLeft = value;
    }
  });
}
