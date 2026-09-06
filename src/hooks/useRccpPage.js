import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyRccpChartSettings } from '../components/rccp/rccpUtils';
import { clearRccpAnalysisPrefetchCache } from '../utils/rccpAnalysisPrefetch';
import { subscribeRccpSettingsSaved } from './rccpSettingsSync';
import { useRccpWindow } from './useRccpWindow';
import { useRccpAnalysisModes } from './useRccpAnalysisModes';
import { usePageActive } from './usePageActive';
import { useBoardRevisionGate } from './useBoardRevisionGate';

export function useRccpPage({ vendorAccount = '', enabled = true } = {}) {
  const {
    isoWindow, setIsoWindow, lastVendor, setLastVendor, loaded: windowLoaded,
    kpiWindowOnly, setKpiWindowOnly, chartVisibleKeys, setChartVisibleKeys,
    planningDateModes, setPlanningDateModes,
  } = useRccpWindow();
  // Elke reload (settings-save, Refresh, nieuwe PO-revisie) is een nieuwe scope: de per-load-date
  // geladen analyses vervallen dan en worden opnieuw opgehaald.
  const [reloadToken, setReloadToken] = useState(0);

  const {
    byMode: analysisByMode, analysis, loading, error, patch, refetch,
  } = useRccpAnalysisModes({
    vendorAccount,
    isoWindow,
    modes: planningDateModes,
    enabled,
    ready: windowLoaded,
    reloadToken,
    useCache: reloadToken === 0,
  });

  const reload = useCallback(() => {
    clearRccpAnalysisPrefetchCache();
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => subscribeRccpSettingsSaved((config) => {
    // Direct toepassen op alle geladen load-dates zodat de grafiek meteen de nieuwe kleuren en
    // chart-types toont, daarna een verse fetch op de achtergrond.
    patch((prev) => applyRccpChartSettings(prev, config));
    clearRccpAnalysisPrefetchCache();
    refetch();
  }), [patch, refetch]);

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
      reload();
    }
  }, [reload]);
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
    kpiWindowOnly,
    setKpiWindowOnly,
    chartVisibleKeys,
    setChartVisibleKeys,
    planningDateModes,
    setPlanningDateModes,
    analysis,
    analysisByMode,
    loading,
    error,
    readOnly: Boolean(analysis?.readOnly),
    measureRows,
    periods,
    cells,
    cellMap,
    reload,
  };
}
