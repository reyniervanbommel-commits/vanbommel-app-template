import { useMemo } from 'react';
import { buildLinkedLineValueByHeaderKey } from '../utils/linkedLineValueMeta';

/**
 * Bouwt stabiele lookup-maps voor gekoppelde subitem-totalen en -waarden.
 */
export function usePurchaseOrdersBoardLinks({
  lineColumns = [],
  lineTotalHeaderLinks = [],
  lineValueHeaderLinks = [],
  isStaff = true,
}) {
  const linkedLineTotalByHeaderKey = useMemo(
    () => lineTotalHeaderLinks.reduce((links, link) => {
      if (link?.headerColumnKey && link?.lineColumnKey) {
        links[link.headerColumnKey] = link.lineColumnKey;
      }
      return links;
    }, {}),
    [lineTotalHeaderLinks]
  );

  const linkedLineValueByHeaderKey = useMemo(
    () => buildLinkedLineValueByHeaderKey(lineValueHeaderLinks, lineColumns, { isStaff }),
    [isStaff, lineColumns, lineValueHeaderLinks]
  );

  return useMemo(
    () => ({ linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey }),
    [linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]
  );
}
