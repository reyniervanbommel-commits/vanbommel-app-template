export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('nl-NL');
}

/** Visible (filtered) rows versus scoped total, e.g. `1.234 / 2.500`. */
export function formatVisibleTotal(visible, total) {
  return `${formatCount(visible)} / ${formatCount(total)}`;
}
