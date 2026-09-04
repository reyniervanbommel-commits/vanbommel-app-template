// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import { useRccpChartFlash } from './useRccpChartFlash';

function FlashProbe() {
  const ref = useRccpChartFlash('probe-1');
  return <div ref={ref}>flash-ok</div>;
}

const periods = [
  { key: '2026-W10', year: 2026, week: 10 },
  { key: '2026-W11', year: 2026, week: 11 },
];

const measureRows = [
  {
    measureKey: 'open', label: 'Open', isOpen: true, color: '#0078D4', showInChart: true,
  },
  {
    measureKey: 'received', label: 'Received', isDelivered: true, color: '#107C10', showInChart: true,
  },
];

const chart = periods.map((period) => ({
  ...period,
  segmentsAbove: [{ itemNumber: 'CFM-2', qty: 4, status: 'open' }],
  segmentsBelow: [{ itemNumber: 'CFM-2', qty: 2, status: 'received' }],
  open: 4,
}));

const cellMap = new Map([
  ['open|2026|10', {
    measureKey: 'open', periodYear: 2026, isoWeek: 10, confirmedQty: 4, statusColor: 'green',
  }],
  ['open|2026|11', {
    measureKey: 'open', periodYear: 2026, isoWeek: 11, confirmedQty: 4, statusColor: 'green',
  }],
]);

describe('RccpChartMatrixPanel (PO-board split)', () => {
  it('renders the compact chart after analysis loads', () => {
    const { container } = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        compact
        chartHeight={180}
      />,
    );
    expect(container.textContent).toContain('Open');
    expect(container.textContent).toContain('Received');
    expect(container.querySelector('.fui-Card')).toBeNull();
  });

  it('can mount the chart fade hook without throwing', () => {
    const { container } = renderWithFluent(<FlashProbe />);
    expect(container.textContent).toContain('flash-ok');
  });

  it('pins the Y-axis to the left edge of the week scroller so it tracks scroll position', () => {
    const { container } = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        compact
        chartHeight={180}
      />,
    );
    const axis = container.querySelector('[data-testid="rccp-sticky-y-axis"]');
    const weekBar = container.querySelector('[aria-label="Scroll weeks"]');
    const scrollRoot = weekBar?.parentElement;
    expect(axis).toBeTruthy();
    expect(scrollRoot).toBeTruthy();
    // The axis lives inside the same horizontally scrolling pane as the chart
    // bars, anchored via a zero-width `position: sticky` wrapper — so it
    // tracks the pane's own scrollLeft instead of staying fixed on screen.
    expect(scrollRoot.contains(axis)).toBe(true);
    let node = axis.parentElement;
    let stickyFound = false;
    while (node && node !== scrollRoot) {
      if (node.style.position === 'sticky') {
        stickyFound = true;
        break;
      }
      node = node.parentElement;
    }
    expect(stickyFound).toBe(true);
  });
});
