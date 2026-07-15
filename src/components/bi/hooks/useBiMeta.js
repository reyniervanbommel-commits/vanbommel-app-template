import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { BOARD_KEY } from '../biConstants';

/**
 * Laadt kolom-metadata voor de BI-builder via GET /api/bi/meta/:boardKey.
 * @returns {{ columns, measureColumns, loading, error }}
 */
export function useBiMeta(boardKey = BOARD_KEY) {
  const [columns, setColumns] = useState([]);
  const [measureColumns, setMeasureColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest(`/bi/meta/${boardKey}`)
      .then((data) => {
        if (!active) return;
        setColumns(Array.isArray(data.columns) ? data.columns : []);
        setMeasureColumns(Array.isArray(data.measureColumns) ? data.measureColumns : []);
      })
      .catch((err) => { if (active) setError(err.message || 'Failed to load metadata'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardKey]);

  return useMemo(() => ({ columns, measureColumns, loading, error }), [columns, measureColumns, loading, error]);
}
