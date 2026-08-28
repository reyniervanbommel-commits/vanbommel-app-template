import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { getBiMeta, loadBiMeta } from '../../../utils/biBoardCache';
import { BOARD_KEY } from '../biConstants';

/**
 * Laadt kolom-metadata voor de BI-builder via GET /api/bi/meta/:boardKey.
 * Deelt in-flight/cache met de idle-prefetch zodat de eerste klik geen dubbele call doet.
 * @returns {{ columns, measureColumns, loading, error }}
 */
export function useBiMeta(boardKey = BOARD_KEY) {
  const cached = getBiMeta(boardKey);
  const [columns, setColumns] = useState(() => cached?.columns || []);
  const [measureColumns, setMeasureColumns] = useState(() => cached?.measureColumns || []);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const warm = getBiMeta(boardKey);
    if (warm) {
      setColumns(warm.columns || []);
      setMeasureColumns(warm.measureColumns || []);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    loadBiMeta(boardKey, () => apiRequest(`/bi/meta/${boardKey}`))
      .then((meta) => {
        if (!active) return;
        setColumns(meta.columns);
        setMeasureColumns(meta.measureColumns);
      })
      .catch((err) => { if (active) setError(err.message || 'Failed to load metadata'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardKey]);

  return useMemo(() => ({ columns, measureColumns, loading, error }), [columns, measureColumns, loading, error]);
}
