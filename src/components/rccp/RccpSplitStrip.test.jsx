// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithFluent } from '../../test-utils/render';
import RccpSplitStrip from './RccpSplitStrip';

const captured = vi.hoisted(() => ({ chartHeight: null }));

vi.mock('../../hooks/useRccpSplitAnalysis', () => ({
  useRccpSplitAnalysis: () => ({
    analysis: { config: { itemPickerColumnKeys: ['productName'] }, chart: [], cells: [] },
    loading: false,
    error: '',
    measureRows: [],
    periods: [],
    cellMap: new Map(),
    chart: [],
    chartWeekRanges: [],
  }),
}));

vi.mock('./RccpChartMatrixPanel', () => ({
  default: (props) => {
    captured.chartHeight = props.chartHeight;
    return <div>chart-matrix</div>;
  },
}));

describe('RccpSplitStrip', () => {
  it('renders the PO-board RCCP pane without an item picker', () => {
    const { container, queryByRole } = renderWithFluent(
      <MemoryRouter>
        <RccpSplitStrip
          vendorAccount="V000583"
          refreshKey="1"
          enabled
          isoWindow={{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 12 }}
        />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain('chart-matrix');
    expect(container.textContent).not.toContain('Open RCCP page');
    expect(container.textContent).not.toContain('Vendor: V000583');
    expect(container.textContent).not.toContain('item-filter');
    expect(queryByRole('tab', { name: 'Week' })).toBeNull();
    expect(queryByRole('tab', { name: 'Requested' })).toBeNull();
  });

  it('keeps a fixed chart height when the split pane is resized', () => {
    const { rerender } = renderWithFluent(
      <MemoryRouter>
        <RccpSplitStrip
          vendorAccount="V000583"
          refreshKey="1"
          enabled
          isoWindow={{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 12 }}
        />
      </MemoryRouter>,
    );
    const first = captured.chartHeight;
    rerender(
      <MemoryRouter>
        <RccpSplitStrip
          vendorAccount="V000583"
          refreshKey="1"
          enabled
          isoWindow={{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 12 }}
        />
      </MemoryRouter>,
    );
    expect(captured.chartHeight).toBe(first);
    expect(captured.chartHeight).toBeGreaterThan(0);
  });
});
