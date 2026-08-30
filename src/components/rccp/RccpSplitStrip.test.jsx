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

vi.mock('./RccpItemFilter', () => ({
  default: () => <div>item-filter</div>,
}));

vi.mock('./useRccpItemFilter', () => ({
  useRccpItemFilter: () => ({
    selectedItems: [],
    items: [],
    filteredChart: [],
    handleItemChange: vi.fn(),
    extraColumns: [],
    extraValues: {},
  }),
}));

describe('RccpSplitStrip', () => {
  it('renders the PO-board RCCP pane without crashing', () => {
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
    expect(container.textContent).toContain('chart-matrix');
  });
});
