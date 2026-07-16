import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';

// Split-screen-voorkeuren (#AB:222) leven in user_board_settings.settings_json onder een eigen
// board-key, zodat we de kolominstellingen van het PO-board niet raken. Geen nieuwe SQL-kolom.
const SPLIT_BOARD_KEY = 'bi-split';
const DEFAULT_HEIGHT = 280;

/**
 * Beheert het inklapbare split-screen-paneel: open/dicht, hoogte en de geselecteerde chart-ids.
 * @returns {{ open, height, chartIds, activeTab, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab }}
 */
export function useSplitPane() {
  const [state, setState] = useState({ open: false, height: DEFAULT_HEIGHT, chartIds: [], activeTab: 'bi' });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/supplier/board-settings/${SPLIT_BOARD_KEY}`)
      .then((data) => {
        if (!active) return;
        const pane = data?.settings?.biSplitPane;
        if (pane) {
          setState({
            open: Boolean(pane.open),
            height: Number(pane.height) || DEFAULT_HEIGHT,
            chartIds: Array.isArray(pane.chartIds) ? pane.chartIds : [],
            activeTab: pane.activeTab === 'rccp' ? 'rccp' : 'bi',
          });
        }
      })
      .catch(() => { /* fallback naar defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        apiRequest(`/supplier/board-settings/${SPLIT_BOARD_KEY}`, {
          method: 'PATCH',
          body: { settings: { biSplitPane: next } },
        }).catch(() => { /* stil falen; lokale state blijft leidend */ });
      }, 400);
      return next;
    });
  }, []);

  const toggleOpen = useCallback(() => update({ open: !state.open }), [update, state.open]);
  const setHeight = useCallback((value) => update({ height: value }), [update]);
  const setChartIds = useCallback((ids) => update({ chartIds: ids }), [update]);
  const toggleChart = useCallback((id) => {
    const chartIds = state.chartIds.includes(id)
      ? state.chartIds.filter((x) => x !== id)
      : [...state.chartIds, id];
    update({ chartIds });
  }, [update, state.chartIds]);

  const setActiveTab = useCallback((activeTab) => {
    update({ activeTab: activeTab === 'rccp' ? 'rccp' : 'bi' });
  }, [update]);

  return useMemo(
    () => ({ ...state, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab }),
    [state, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab],
  );
}
