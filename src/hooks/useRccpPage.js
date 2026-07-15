import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { buildAnalysisQuery, currentIsoWindow } from '../components/rccp/rccpUtils';

export function useRccpPage({ vendorAccount = '' } = {}) {
  const [window, setWindow] = useState(() => currentIsoWindow(8));
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readOnly, setReadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(buildAnalysisQuery(window, vendorAccount || undefined));
      setAnalysis(data);
      setReadOnly(Boolean(data.readOnly));
    } catch (err) {
      setError(err.message || 'Failed to load RCCP analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [window, vendorAccount]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => analysis?.categories || [], [analysis]);
  const periods = useMemo(() => analysis?.periods || [], [analysis]);
  const cells = useMemo(() => analysis?.cells || [], [analysis]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const cell of cells) {
      map.set(`${cell.capacityCategory}|${cell.periodYear}|${cell.isoWeek}`, cell);
    }
    return map;
  }, [cells]);

  return {
    window,
    setWindow,
    analysis,
    loading,
    error,
    readOnly,
    categories,
    periods,
    cells,
    cellMap,
    reload: load,
  };
}
