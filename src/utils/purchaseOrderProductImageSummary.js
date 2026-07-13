function resolveLineItemNumber(line) {
  const value = line?.itemNumber ?? line?.values?.itemNumber;
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

/**
 * Returns the first visible item and the count of following unique items.
 * Input order is preserved so the board's current line order determines preview.
 */
export function getPurchaseOrderProductImageSummary(lines) {
  const uniqueItemNumbers = [];
  const seenItemNumbers = new Set();

  for (const line of Array.isArray(lines) ? lines : []) {
    if (line?.isRemoved) continue;
    const itemNumber = resolveLineItemNumber(line);
    if (!itemNumber || seenItemNumbers.has(itemNumber)) continue;
    seenItemNumbers.add(itemNumber);
    uniqueItemNumbers.push(itemNumber);
  }

  return {
    firstItemNumber: uniqueItemNumbers[0] || '',
    additionalItemCount: Math.max(uniqueItemNumbers.length - 1, 0),
  };
}
