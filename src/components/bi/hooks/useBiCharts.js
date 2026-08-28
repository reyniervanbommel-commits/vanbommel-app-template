import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { getBiCharts, loadBiCharts } from '../../../utils/biBoardCache';

/**
 * CRUD van BI-grafiekdefinities via /api/bi/charts.
 * @returns {{ charts, loading, error, reload, createChart, updateChart, deleteChart }}
 */
export function useBiCharts() {
  const [charts, setCharts] = useState(() => getBiCharts() || []);
  const [loading, setLoading] = useState(() => getBiCharts() == null);
  const [error, setError] = useState(null);

  const reload = useCallback(async ({ silent = false, force = true } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const next = await loadBiCharts(() => apiRequest('/bi/charts'), { force });
      setCharts(next);
    } catch (err) {
      setError(err.message || 'Failed to load charts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getBiCharts() != null) return undefined;
    let active = true;
    loadBiCharts(() => apiRequest('/bi/charts'))
      .then((next) => { if (active) setCharts(next); })
      .catch((err) => { if (active) setError(err.message || 'Failed to load charts'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const createChart = useCallback(async ({ name, config, visibility, boardKey }) => {
    const data = await apiRequest('/bi/charts', { method: 'POST', body: { name, config, visibility, boardKey } });
    setCharts((prev) => [...prev, data.chart].sort((a, b) => a.name.localeCompare(b.name)));
    return data.chart;
  }, []);

  const updateChart = useCallback(async (id, { name, config, visibility }) => {
    const data = await apiRequest(`/bi/charts/${id}`, { method: 'PATCH', body: { name, config, visibility } });
    setCharts((prev) => prev.map((chart) => (chart.id === id ? data.chart : chart)));
    return data.chart;
  }, []);

  const deleteChart = useCallback(async (id) => {
    await apiRequest(`/bi/charts/${id}`, { method: 'DELETE' });
    setCharts((prev) => prev.filter((chart) => chart.id !== id));
  }, []);

  return useMemo(
    () => ({ charts, loading, error, reload, createChart, updateChart, deleteChart }),
    [charts, loading, error, reload, createChart, updateChart, deleteChart],
  );
}
