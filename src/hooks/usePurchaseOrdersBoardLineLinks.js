import { useMemo } from 'react';
import { buildLinkedLineValueByHeaderKey } from '../utils/linkedLineValueMeta';

/**
 * Maps configured line-to-header links to lookup objects for board cells.
 */
export function usePurchaseOrdersBoardLineLinks({
  lineTotalHeaderLinks,
  lineValueHeaderLinks,
  lineColumns,
  isStaff = true,
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
    () => buildLinkedLineValueByHeaderKey(lineValueHeaderLinks, lineColumns, { isStaff }),
    [isStaff, lineColumns, lineValueHeaderLinks]
  );

  return { linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey };
}
