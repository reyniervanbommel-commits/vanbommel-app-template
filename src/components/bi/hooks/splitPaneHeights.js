export const DEFAULT_PANE_HEIGHTS = Object.freeze({ bi: 280, rccp: 280, kpis: 188 });
export const MIN_PANE_HEIGHT = 120;
export const MAX_PANE_HEIGHT = 640;
export const MISTAKEN_TALL_HEIGHT = 440;

export function clampPaneHeight(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_PANE_HEIGHT, Math.max(MIN_PANE_HEIGHT, Math.round(parsed)));
}

/**
 * Herstelt per-tab hoogtes. Eén oude `height` geldt voor Charts/RCCP;
 * 440px (eerdere vergissing) valt terug op 280. KPI start lager.
 */
export function normalizeHeightByTab(pane = {}) {
  const saved = pane.heightByTab && typeof pane.heightByTab === 'object' ? pane.heightByTab : {};
  const legacy = Number(pane.height);
  const biRccpFallback = (!Number.isFinite(legacy) || legacy === MISTAKEN_TALL_HEIGHT)
    ? DEFAULT_PANE_HEIGHTS.bi
    : clampPaneHeight(legacy, DEFAULT_PANE_HEIGHTS.bi);
  return {
    bi: clampPaneHeight(saved.bi, biRccpFallback),
    rccp: clampPaneHeight(saved.rccp, biRccpFallback),
    kpis: clampPaneHeight(saved.kpis, DEFAULT_PANE_HEIGHTS.kpis),
  };
}

export function heightForTab(heightByTab, tab) {
  const key = tab === 'rccp' || tab === 'kpis' ? tab : 'bi';
  return heightByTab?.[key] ?? DEFAULT_PANE_HEIGHTS[key];
}
