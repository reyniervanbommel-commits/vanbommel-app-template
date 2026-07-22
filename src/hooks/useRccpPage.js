import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { buildAnalysisQuery } from '../components/rccp/rccpUtils';
import { getCachedRccpAnalysis } from '../utils/rccpAnalysisPrefetch';
import { useRccpWindow } from './useRccpWindow';

export function useRccpPage({ vendorAccount = '', enabled = true } = {}) {
  const { isoWindow, setIsoWindow, loaded: windowLoaded } = useRccpWindow();
  const [analysis, setAnalysis] = useState(null);
  // false, niet true: zolang er geen vendor gekozen is (enabled=false) mag er geen spinner
  // getoond worden — de dashboard toont dan een "kies een vendor"-lege-staat.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!windowLoaded || !enabled) {
      // Geen vendor (nog) gekozen: leegmaken zodat een vorige selectie niet blijft hangen.
      setAnalysis(null);
      setError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      // Was deze vendor al op de achtergrond aan het laden (hover/highlight in de zoeklijst)?
      // Hergebruik die call in plaats van een dubbele apiRequest te vuren.
      const cached = vendorAccount ? getCachedRccpAnalysis(isoWindow, vendorAccount) : null;
      const data = await (cached || apiRequest(buildAnalysisQuery(isoWindow, vendorAccount || undefined)));
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
