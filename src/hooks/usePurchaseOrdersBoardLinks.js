import { useMemo } from 'react';

/**
 * Bouwt stabiele lookup-maps voor gekoppelde subitem-totalen en -waarden.
 */
export function usePurchaseOrdersBoardLinks({
  lineColumns = [],
  lineTotalHeaderLinks = [],
  lineValueHeaderLinks = [],
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
    () => lineValueHeaderLinks.reduce((links, link) => {
      if (!link?.headerColumnKey || !link?.lineColumnKey) return links;
      const lineColumn = lineColumns.find(({ key }) => key === link.lineColumnKey);
      if (lineColumn) {
        links[link.headerColumnKey] = {
          lineColumnKey: link.lineColumnKey,
          lineDataType: lineColumn.dataType,
        };
      }
      return links;
    }, {}),
    [lineColumns, lineValueHeaderLinks]
  );

  return useMemo(
    () => ({ linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey }),
    [linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]
  );
}
