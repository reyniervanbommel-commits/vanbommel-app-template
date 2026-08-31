// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithFluent } from '../../test-utils/render';
import RccpSplitStrip from './RccpSplitStrip';

vi.mock('../../hooks/useRccpSplitAnalysis', () => ({
  useRccpSplitAnalysis: () => ({
    analysis: { config: { itemPickerColumnKeys: ['productName'] }, chart: [] },
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
  default: () => <div>chart-matrix</div>,
}));

describe('RccpSplitStrip', () => {
  it('renders the PO-board RCCP pane without an item picker', () => {
    const { container } = renderWithFluent(
      <MemoryRouter>
        <RccpSplitStrip
          vendorAccount="V000583"
          refreshKey="1"
          height={280}
          enabled
          isoWindow={{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 12 }}
        />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain('Open RCCP page');
    expect(container.textContent).toContain('Requested');
    expect(container.textContent).toContain('Confirmed');
    expect(container.textContent).toContain('chart-matrix');
    expect(container.textContent).not.toContain('item-filter');
  });
});
