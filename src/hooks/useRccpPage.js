import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { applyRccpChartSettings, buildAnalysisQuery } from '../components/rccp/rccpUtils';
import { clearRccpAnalysisPrefetchCache, getCachedRccpAnalysis } from '../utils/rccpAnalysisPrefetch';
import { subscribeRccpSettingsSaved } from './rccpSettingsSync';
import { useRccpWindow } from './useRccpWindow';
import { usePageActive } from './usePageActive';
import { useBoardRevisionGate } from './useBoardRevisionGate';

export function useRccpPage({ vendorAccount = '', enabled = true } = {}) {
  const {
    isoWindow, setIsoWindow, lastVendor, setLastVendor, loaded: windowLoaded,
  } = useRccpWindow();
  const [analysis, setAnalysis] = useState(null);
  // false, niet true: zolang er geen vendor gekozen is (enabled=false) mag er geen spinner
  // getoond worden — de dashboard toont dan een "kies een vendor"-lege-staat.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async ({ bypassCache = false, skipLoading = false } = {}) => {
    if (!windowLoaded || !enabled) {
      // Geen vendor (nog) gekozen: leegmaken zodat een vorige selectie niet blijft hangen.
      setAnalysis(null);
      setError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    if (!skipLoading) setLoading(true);
    setError('');
    try {
      // Was deze vendor al op de achtergrond aan het laden (hover/highlight in de zoeklijst)?
      // Hergebruik die call in plaats van een dubbele apiRequest te vuren — behalve na een
      // expliciete reload (settings/refresh/PO-revisie), anders blijft de grafiek op de oude
      // chartType hangen.
      if (bypassCache) clearRccpAnalysisPrefetchCache();
      const cached = (!bypassCache && vendorAccount)
        ? getCachedRccpAnalysis(isoWindow, vendorAccount)
        : null;
      const data = await (cached || apiRequest(buildAnalysisQuery(isoWindow, vendorAccount || undefined)));
      if (requestId !== requestIdRef.current) return;
      setAnalysis(data);
      setReadOnly(Boolean(data.readOnly));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load RCCP analysis');
      setAnalysis(null);
    } finally {
      if (requestId === requestIdRef.current && !skipLoading) setLoading(false);
    }
  }, [isoWindow, vendorAccount, windowLoaded, enabled]);

  const reload = useCallback(() => load({ bypassCache: true }), [load]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => subscribeRccpSettingsSaved((config) => {
    setAnalysis((prev) => applyRccpChartSettings(prev, config));
    load({ bypassCache: true, skipLoading: true });
  }), [load]);

  // Keep-alive: bij terugkeer naar de (verborgen gehouden) RCCP-pagina checkt de gate de
  // PO-revisie. Alleen PO muteert data die de RCCP-analyse raakt, dus bij een gewijzigde revisie
  // herladen we de analyse; bij gelijke revisie gebeurt er niets (instant terugkeer).
  const pageActive = usePageActive();
  const seenRevisionRef = useRef(null);
  const handleRevision = useCallback((rev) => {
    if (!rev) return;
    if (seenRevisionRef.current === null) {
      seenRevisionRef.current = rev; // baseline bij eerste activatie
      return;
    }
    if (rev !== seenRevisionRef.current) {
      seenRevisionRef.current = rev;
      load({ bypassCache: true });
    }
  }, [load]);
  useBoardRevisionGate({ active: pageActive, onRevision: handleRevision, runOnMount: true });

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
    lastVendor,
    setLastVendor,
    analysis,
    loading,
    error,
    readOnly,
    measureRows,
    periods,
    cells,
    cellMap,
    reload,
  };
}
