import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { buildAnalysisQuery } from '../components/rccp/rccpUtils';
import { useRccpWindow } from './useRccpWindow';

export function useRccpPage({ vendorAccount = '', enabled = true } = {}) {
  const { isoWindow, setIsoWindow, loaded: windowLoaded } = useRccpWindow();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!windowLoaded || !enabled) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(buildAnalysisQuery(isoWindow, vendorAccount || undefined));
      if (requestId !== requestIdRef.current) return;
      setAnalysis(data);
      setReadOnly(Boolean(data.readOnly));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load RCCP analysis');
      setAnalysis(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [isoWindow, vendorAccount, windowLoaded, enabled]);

  useEffect(() => { load(); }, [load]);

  const measureRows = useMemo(() => analysis?.measureRows || [], [analysis]);
  const periods = useMemo(() => analysis?.periods || [], [analysis]);
  const cells = useMemo(() => analysis?.cells || [], [analysis]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const cell of cells) {
      map.set(`${cell.measureKey}|${cell.periodYear}|${cell.isoWeek}`, cell);
    }
    return map;
  }, [cells]);

  return {
    window: isoWindow,
    setWindow: setIsoWindow,
    windowLoaded,
    analysis,
    loading,
    error,
    readOnly,
    measureRows,
    periods,
    cells,
    cellMap,
    reload: load,
  };
}
