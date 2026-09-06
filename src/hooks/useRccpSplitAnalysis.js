import { useEffect, useMemo } from 'react';
import { applyRccpChartSettings } from '../components/rccp/rccpUtils';
import { clearRccpAnalysisPrefetchCache } from '../utils/rccpAnalysisPrefetch';
import { subscribeRccpSettingsSaved } from './rccpSettingsSync';
import { useRccpAnalysisModes } from './useRccpAnalysisModes';

const SPLIT_DEBOUNCE_MS = 300;

export function useRccpSplitAnalysis({
  vendorAccount, isoWindow, enabled, refreshKey, planningDateModes,
}) {
  const {
    byMode, analysis, loading, error, patch, refetch,
  } = useRccpAnalysisModes({
    vendorAccount,
    isoWindow,
    modes: planningDateModes,
    enabled,
    reloadToken: refreshKey || '',
    debounceMs: SPLIT_DEBOUNCE_MS,
    keepPrevious: true,
  });

  useEffect(() => subscribeRccpSettingsSaved((config) => {
    patch((prev) => applyRccpChartSettings(prev, config));
    clearRccpAnalysisPrefetchCache();
    refetch();
  }), [patch, refetch]);

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
    analysisByMode: byMode,
    loading,
    error,
    measureRows,
    periods,
    cellMap,
    chart: analysis?.chart || [],
    chartWeekRanges: analysis?.config?.chartWeekRanges || [],
  };
}
