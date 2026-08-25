'use strict';

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 640;
const DEFAULT_HEIGHTS = Object.freeze({ bi: 280, rccp: 280, kpis: 188 });
const SPLIT_TABS = new Set(['bi', 'rccp', 'kpis']);

function clampHeight(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(parsed)));
}

function normalizeSplitTab(tab) {
  return SPLIT_TABS.has(tab) ? tab : 'bi';
}

function normalizeHeightByTab(saved, legacyHeight) {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  const fallback = clampHeight(legacyHeight, DEFAULT_HEIGHTS.bi);
  return {
    bi: clampHeight(source.bi, fallback),
    rccp: clampHeight(source.rccp, fallback),
    kpis: clampHeight(source.kpis, DEFAULT_HEIGHTS.kpis),
  };
}

/**
 * Split-pane voorkeuren: per gebruiker in user_board_settings (board_key bi-split).
 * Niet per saved view. Wel per tab (Charts / RCCP / KPIs).
 */
function normalizeBiSplitPane(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const chartIds = Array.isArray(value.chartIds)
    ? Array.from(new Set(value.chartIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 12)
    : [];
  const activeTab = normalizeSplitTab(value.activeTab);
  const heightByTab = normalizeHeightByTab(value.heightByTab, value.height);
  return {
    open: value.open === true,
    height: heightByTab[activeTab],
    heightByTab,
    chartIds,
    activeTab,
  };
}

module.exports = { normalizeBiSplitPane };
