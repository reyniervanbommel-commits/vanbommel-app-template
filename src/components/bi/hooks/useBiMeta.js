import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { getBiMeta, setBiMeta } from '../../../utils/biBoardCache';
import { BOARD_KEY } from '../biConstants';

/**
 * Laadt kolom-metadata voor de BI-builder via GET /api/bi/meta/:boardKey.
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
    if (!warm) {
      setLoading(true);
      setError(null);
    }
    apiRequest(`/bi/meta/${boardKey}`)
      .then((data) => {
        if (!active) return;
        const nextColumns = Array.isArray(data.columns) ? data.columns : [];
        const nextMeasures = Array.isArray(data.measureColumns) ? data.measureColumns : [];
        setColumns(nextColumns);
        setMeasureColumns(nextMeasures);
        setBiMeta(boardKey, { columns: nextColumns, measureColumns: nextMeasures });
      })
      .catch((err) => { if (active) setError(err.message || 'Failed to load metadata'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardKey]);

  return useMemo(() => ({ columns, measureColumns, loading, error }), [columns, measureColumns, loading, error]);
}
