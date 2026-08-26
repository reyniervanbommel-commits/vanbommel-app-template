import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { applyRccpChartSettings, buildAnalysisQuery } from '../components/rccp/rccpUtils';
import { clearRccpAnalysisPrefetchCache, getCachedRccpAnalysis } from '../utils/rccpAnalysisPrefetch';
import { subscribeRccpSettingsSaved } from './rccpSettingsSync';

export function useRccpSplitAnalysis({ vendorAccount, isoWindow, enabled, refreshKey }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async ({ skipLoading = false } = {}) => {
    if (!enabled || !isoWindow) return;
    if (!skipLoading) setLoading(true);
    setError('');
    try {
      // Zonder vendor (all-vendors op de split-tab) is er nooit een prefetch — geen cache-lookup,
      // gewoon de bestaande fetch.
      const cached = vendorAccount ? getCachedRccpAnalysis(isoWindow, vendorAccount) : null;
      const data = await (cached || apiRequest(buildAnalysisQuery(isoWindow, vendorAccount || undefined)));
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Failed to load RCCP analysis');
      setAnalysis(null);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, [enabled, isoWindow, vendorAccount]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [enabled, load, refreshKey]);

  useEffect(() => subscribeRccpSettingsSaved((config) => {
    setAnalysis((prev) => applyRccpChartSettings(prev, config));
    clearRccpAnalysisPrefetchCache();
    load({ skipLoading: true });
  }), [load]);

  const measureRows = useMemo(() => analysis?.measureRows || [], [analysis]);
  const periods = useMemo(() => analysis?.periods || [], [analysis]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const cell of analysis?.cells || []) {
      map.set(`${cell.measureKey}|${cell.periodYear}|${cell.isoWeek}`, cell);
    }
    return map;
  }, [analysis]);

  return {
    analysis,
    loading,
    error,
    measureRows,
    periods,
    cellMap,
    chart: analysis?.chart || [],
    chartWeekRanges: analysis?.config?.chartWeekRanges || [],
  };
}
