import { describe, it, expect } from 'vitest';
import {
  clampPaneHeight,
  normalizeHeightByTab,
  DEFAULT_PANE_HEIGHTS,
  MISTAKEN_TALL_HEIGHT,
} from './splitPaneHeights';

describe('normalizeHeightByTab', () => {
  it('keeps Charts/RCCP at 280 and KPIs lower when nothing is saved', () => {
    expect(normalizeHeightByTab({})).toEqual(DEFAULT_PANE_HEIGHTS);
  });

  it('reuses a custom legacy height for Charts and RCCP, not KPIs', () => {
    expect(normalizeHeightByTab({ height: 360 })).toEqual({
      bi: 360,
      rccp: 360,
      kpis: DEFAULT_PANE_HEIGHTS.kpis,
    });
  });

  it('rolls the mistaken 440px default back to 280 for Charts and RCCP', () => {
    expect(normalizeHeightByTab({ height: MISTAKEN_TALL_HEIGHT })).toEqual(DEFAULT_PANE_HEIGHTS);
  });

  it('keeps per-tab heights when they were saved', () => {
    expect(normalizeHeightByTab({
      height: 280,
      heightByTab: { bi: 300, rccp: 250, kpis: 160 },
    })).toEqual({ bi: 300, rccp: 250, kpis: 160 });
  });

  it('clamps out-of-range values', () => {
    expect(clampPaneHeight(20, 280)).toBe(120);
    expect(clampPaneHeight(900, 280)).toBe(640);
  });
});
