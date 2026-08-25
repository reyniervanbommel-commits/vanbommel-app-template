import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import {
  clampPaneHeight,
  DEFAULT_PANE_HEIGHTS,
  heightForTab,
  normalizeHeightByTab,
} from './splitPaneHeights';

const SPLIT_BOARD_KEY = 'bi-split';
const SPLIT_TABS = new Set(['bi', 'rccp', 'kpis']);

function normalizeSplitTab(tab) {
  return SPLIT_TABS.has(tab) ? tab : 'bi';
}

/**
 * Beheert het inklapbare split-screen-paneel: open/dicht, per-tab hoogte en chart-ids.
 * @returns {{ open, height, heightByTab, chartIds, activeTab, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab }}
 */
export function useSplitPane() {
  const [state, setState] = useState({
    open: false,
    heightByTab: { ...DEFAULT_PANE_HEIGHTS },
    chartIds: [],
    activeTab: 'bi',
  });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiRequest(`/supplier/board-settings/${SPLIT_BOARD_KEY}`, {
        method: 'PATCH',
        body: {
          settings: {
            biSplitPane: {
              ...next,
              height: heightForTab(next.heightByTab, next.activeTab),
            },
          },
        },
      }).catch(() => { /* stil falen; lokale state blijft leidend */ });
    }, 400);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest(`/supplier/board-settings/${SPLIT_BOARD_KEY}`)
      .then((data) => {
        if (!active) return;
        const pane = data?.settings?.biSplitPane;
        if (pane) {
          setState({
            open: false,
            heightByTab: normalizeHeightByTab(pane),
            chartIds: Array.isArray(pane.chartIds) ? pane.chartIds : [],
            activeTab: normalizeSplitTab(pane.activeTab),
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
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleOpen = useCallback(() => update({ open: !state.open }), [update, state.open]);
  const setHeight = useCallback((value) => {
    setState((prev) => {
      const tab = normalizeSplitTab(prev.activeTab);
      const nextHeight = clampPaneHeight(value, DEFAULT_PANE_HEIGHTS[tab]);
      const next = {
        ...prev,
        heightByTab: { ...prev.heightByTab, [tab]: nextHeight },
      };
      persist(next);
      return next;
    });
  }, [persist]);
  const setChartIds = useCallback((ids) => update({ chartIds: ids }), [update]);
  const toggleChart = useCallback((id) => {
    const chartIds = state.chartIds.includes(id)
      ? state.chartIds.filter((x) => x !== id)
      : [...state.chartIds, id];
    update({ chartIds });
  }, [update, state.chartIds]);

  const setActiveTab = useCallback((activeTab) => {
    update({ activeTab: normalizeSplitTab(activeTab) });
  }, [update]);

  const height = heightForTab(state.heightByTab, state.activeTab);

  return useMemo(
    () => ({ ...state, height, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab }),
    [state, height, loaded, toggleOpen, setHeight, toggleChart, setChartIds, setActiveTab],
  );
}
