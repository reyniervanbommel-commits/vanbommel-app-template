import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { buildAnalysisQuery } from '../components/rccp/rccpUtils';

/**
 * RCCP-analyse voor het PO split-pane: debounced reload bij tabel-/filterwijzigingen.
 * @param {{ vendorAccount?: string, isoWindow: object, enabled: boolean, refreshKey: string }} params
 */
export function useRccpSplitAnalysis({ vendorAccount, isoWindow, enabled, refreshKey }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    if (!enabled || !isoWindow) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(buildAnalysisQuery(isoWindow, vendorAccount || undefined));
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Failed to load RCCP analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, isoWindow, vendorAccount]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, load, refreshKey]);

  const categories = useMemo(() => analysis?.categories || [], [analysis]);
  const periods = useMemo(() => analysis?.periods || [], [analysis]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const cell of analysis?.cells || []) {
      map.set(`${cell.capacityCategory}|${cell.periodYear}|${cell.isoWeek}`, cell);
    }
    return map;
  }, [analysis]);

  return {
    analysis,
    loading,
    error,
    categories,
    periods,
    cellMap,
    chart: analysis?.chart || [],
    categoryColumnKey: analysis?.config?.categoryColumnKey || '',
  };
}
