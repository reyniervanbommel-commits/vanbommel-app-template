import { useMemo } from 'react';

/**
 * Maps configured line-to-header links to lookup objects for board cells.
 */
export function usePurchaseOrdersBoardLineLinks({
  lineTotalHeaderLinks,
  lineValueHeaderLinks,
  lineColumns,
}) {
  const linkedLineTotalByHeaderKey = useMemo(
    () => (Array.isArray(lineTotalHeaderLinks)
      ? lineTotalHeaderLinks.reduce((acc, link) => {
        if (link?.headerColumnKey && link?.lineColumnKey) {
          acc[link.headerColumnKey] = link.lineColumnKey;
        }
        return acc;
      }, {})
      : {}),
    [lineTotalHeaderLinks]
  );
  const linkedLineValueByHeaderKey = useMemo(
    () => (Array.isArray(lineValueHeaderLinks)
      ? lineValueHeaderLinks.reduce((acc, link) => {
        if (!link?.headerColumnKey || !link?.lineColumnKey) return acc;
        const lineColumn = lineColumns.find((entry) => entry.key === link.lineColumnKey);
        if (lineColumn) {
          acc[link.headerColumnKey] = {
            lineColumnKey: link.lineColumnKey,
            lineDataType: lineColumn.dataType,
          };
        }
        return acc;
      }, {})
      : {}),
    [lineValueHeaderLinks, lineColumns]
  );

  return { linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey };
}
