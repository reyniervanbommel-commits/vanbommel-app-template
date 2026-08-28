import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../utils/api';

/**
 * Loads item-entity values for the RCCP item picker extra columns.
 * @param {string[]} itemNumbers
 * @param {string[]} columnKeys
 */
export function useRccpItemLookup(itemNumbers, columnKeys) {
  const [columns, setColumns] = useState([]);
  const [byItem, setByItem] = useState({});
  const itemsKey = (itemNumbers || []).join('\0');
  const keysKey = (columnKeys || []).join('\0');

  useEffect(() => {
    const numbers = itemsKey ? itemsKey.split('\0') : [];
    const keys = keysKey ? keysKey.split('\0') : [];
    if (!keys.length || !numbers.length) {
      setColumns(keys.map((key) => ({ key, label: key })));
      setByItem({});
      return undefined;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    params.set('itemNumbers', numbers.join(','));
    apiRequest(`/rccp/item-lookup?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setColumns(Array.isArray(data?.columns) ? data.columns : []);
        setByItem(data?.byItem && typeof data.byItem === 'object' ? data.byItem : {});
      })
      .catch(() => {
        if (cancelled) return;
        setColumns([]);
        setByItem({});
      });

    return () => { cancelled = true; };
  }, [itemsKey, keysKey]);

  return useMemo(() => ({ columns, byItem }), [columns, byItem]);
}
