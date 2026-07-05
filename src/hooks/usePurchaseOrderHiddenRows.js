import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { BOARD_TB_SOURCE } from '../config/featureFlags';

// Board-cutover (#AB:171/#176): endpoints achter BOARD_TB_SOURCE. De tb_*-laag levert verborgen rijen
// met partitionKey/recordKey; we mappen ze naar de board-vorm (dataAreaId/orderNumber) zodat de UI
// en restoreRows ongewijzigd blijven.
const HIDDEN_BASE = BOARD_TB_SOURCE ? '/data/purchase-orders' : '/purchase-orders';

// Haalt de verborgen (verwijderde) rijen op die nog binnen de harde D365-filter vallen,
// en biedt "terugzetten" (include) aan. Na terugzetten wordt onRestored aangeroepen zodat
// de aanroeper het overzicht kan herladen.
export function usePurchaseOrderHiddenRows({ onRestored } = {}) {
  const [hiddenRows, setHiddenRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`${HIDDEN_BASE}/rows/hidden-in-filter`);
      const rawRows = Array.isArray(data?.rows) ? data.rows : [];
      // tb_*-rijen hebben partitionKey/recordKey; naar de board-vorm mappen (dataAreaId/orderNumber).
      const mapped = BOARD_TB_SOURCE
        ? rawRows.map((r) => ({ ...r, dataAreaId: r.partitionKey, orderNumber: r.recordKey }))
        : rawRows;
      setHiddenRows(mapped);
      setColumns(Array.isArray(data?.columns) ? data.columns : []);
      setCount(Number(data?.count) || mapped.length);
    } catch {
      // Stil falen: dit is een informatief signaal, geen kritieke flow.
      setHiddenRows([]);
      setColumns([]);
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
      // tb_*-include verwacht {partitionKey, recordKey}; po_* de order-vorm.
      const body = BOARD_TB_SOURCE
        ? { rows: targets.map((t) => ({ partitionKey: t.dataAreaId, recordKey: t.orderNumber })) }
        : { rows: targets };
      await apiRequest(`${HIDDEN_BASE}/rows/include`, { method: 'POST', body });
      await reload();
      if (onRestored) await onRestored();
    } finally {
      setRestoring(false);
    }
  }, [reload, onRestored]);

  return {
    hiddenRows,
    columns,
    count,
    loading,
    restoring,
    reload,
    restoreRows,
  };
}
