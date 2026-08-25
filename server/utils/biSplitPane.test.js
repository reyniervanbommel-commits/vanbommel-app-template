'use strict';

const { normalizeBiSplitPane } = require('./biSplitPane');

describe('normalizeBiSplitPane', () => {
  it('keeps per-tab heights and the KPIs tab', () => {
    const pane = normalizeBiSplitPane({
      open: false,
      activeTab: 'kpis',
      height: 200,
      heightByTab: { bi: 300, rccp: 250, kpis: 160 },
      chartIds: [1],
    });
    expect(pane.activeTab).toBe('kpis');
    expect(pane.heightByTab).toEqual({ bi: 300, rccp: 250, kpis: 160 });
    expect(pane.height).toBe(160);
  });

  it('fills KPI height from the default when only a legacy height exists', () => {
    const pane = normalizeBiSplitPane({ height: 360, activeTab: 'bi' });
    expect(pane.heightByTab.bi).toBe(360);
    expect(pane.heightByTab.rccp).toBe(360);
    expect(pane.heightByTab.kpis).toBe(188);
  });
});
