import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

// Haalt de verborgen (verwijderde) rijen op die nog binnen de harde D365-filter vallen,
// en biedt "terugzetten" (include) aan. Na terugzetten wordt onRestored aangeroepen zodat
// de aanroeper het overzicht kan herladen.
export function usePurchaseOrderHiddenRows({ onRestored } = {}) {
  const [hiddenRows, setHiddenRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/purchase-orders/rows/hidden-in-filter');
      setHiddenRows(Array.isArray(data?.rows) ? data.rows : []);
      setCount(Number(data?.count) || 0);
    } catch {
      // Stil falen: dit is een informatief signaal, geen kritieke flow.
      setHiddenRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Zet één of meer rijen terug in het overzicht (hef de exclusion op).
  const restoreRows = useCallback(async (rows) => {
    const targets = (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.dataAreaId && row.orderNumber)
      .map((row) => ({ dataAreaId: row.dataAreaId, orderNumber: row.orderNumber }));
    if (!targets.length) return;
    setRestoring(true);
    try {
      await apiRequest('/purchase-orders/rows/include', {
        method: 'POST',
        body: { rows: targets },
      });
      await reload();
      if (onRestored) await onRestored();
    } finally {
      setRestoring(false);
    }
  }, [reload, onRestored]);

  return {
    hiddenRows,
    count,
    loading,
    restoring,
    reload,
    restoreRows,
  };
}
