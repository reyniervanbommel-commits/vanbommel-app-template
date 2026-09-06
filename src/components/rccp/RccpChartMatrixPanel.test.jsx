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

  it('draws both load-date series side by side when both toggles are on', () => {
    const secondary = periods.map((period) => ({
      ...period,
      segmentsAbove: [{ itemNumber: 'CFM-2', qty: 3, status: 'open' }],
      segmentsBelow: [],
      open: 3,
    }));
    const { container } = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        chartSecondary={secondary}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        cellMapSecondary={cellMap}
        planningDateModes={{ requested: true, confirmed: true }}
        compact
        chartHeight={180}
      />,
    );
    expect(container.textContent).toContain('Open (requested)');
    expect(container.textContent).toContain('Open (confirmed)');
  });

  it('keeps one series and one legend label when a single load date is on', () => {
    const { container } = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        planningDateModes="requested"
        compact
        chartHeight={180}
      />,
    );
    expect(container.textContent).not.toContain('(confirmed)');
    expect(container.textContent).not.toContain('(requested)');
  });

  // Klikbare hit-area per item: onzichtbaar, de kleur zit in een los achtergrond-rect (fillRects).
  function poRects(container) {
    return [...container.querySelectorAll('rect')]
      .filter((rect) => rect.getAttribute('pointer-events') === 'all');
  }

  // Eén gevuld achtergrond-rect per staaf (alleen bij requested/gevuld, niet bij confirmed/outline).
  function fillRects(container) {
    return [...container.querySelectorAll('rect')].filter((rect) => (
      rect.getAttribute('pointer-events') === 'none'
      && rect.getAttribute('fill') !== 'none'
    ));
  }

  function outlineRects(container) {
    return [...container.querySelectorAll('rect')].filter((rect) => (
      rect.getAttribute('pointer-events') === 'none'
      && rect.getAttribute('fill') === 'none'
      && rect.getAttribute('stroke')
    ));
  }

  it('fills the requested bars and outlines the confirmed ones', () => {
    const filled = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        planningDateModes="requested"
        compact
        chartHeight={180}
      />,
    );
    const fills = fillRects(filled.container);
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((rect) => rect.getAttribute('fill') !== 'none')).toBe(true);

    // Ook de gevulde staaf heeft één rand om het geheel, geen lijnen tussen de items.
    expect(outlineRects(filled.container).length).toBeGreaterThan(0);
    // De klikbare item-vlakken zelf blijven onzichtbaar (hit-area) en zonder eigen rand.
    const filledRects = poRects(filled.container);
    expect(filledRects.length).toBeGreaterThan(0);
    expect(filledRects.every((rect) => rect.getAttribute('fill') === 'none')).toBe(true);
    expect(filledRects.every((rect) => rect.getAttribute('stroke') === 'none')).toBe(true);

    // Twee items in dezelfde staaf, niets onder de as: dan hoort er precies één rand per week
    // te staan — niet één per item.
    const stacked = periods.map((period) => ({
      ...period,
      segmentsAbove: [
        { itemNumber: 'CFM-2', qty: 4, status: 'open' },
        { itemNumber: 'CFM-3', qty: 2, status: 'open' },
      ],
      segmentsBelow: [],
      open: 6,
    }));
    const outlined = renderWithFluent(
      <RccpChartMatrixPanel
        chart={stacked}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        planningDateModes="confirmed"
        compact
        chartHeight={180}
      />,
    );
    const outlines = outlineRects(outlined.container);
    expect(outlines.length).toBe(periods.length);
    expect(outlines.every((rect) => rect.getAttribute('fill') === 'none')).toBe(true);
    // De klikbare segmentvlakken binnen de staaf hebben zelf geen rand meer.
    const segments = poRects(outlined.container);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((rect) => rect.getAttribute('stroke') === 'none')).toBe(true);
  });

  it('pins the Y-axis labels to the left edge of the pane', () => {
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
    expect(axis.parentElement.style.position).toBe('sticky');
    expect(axis.parentElement.style.left).toBe('0px');
  });

  it('keeps the legend outside the scrolling chart pane, centred under the chart', () => {
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
    const legend = container.querySelector('[aria-label="Chart legend"]');
    expect(legend).toBeTruthy();
    expect(legend.textContent).toContain('Open');
    expect(legend.textContent).toContain('Received');
    // Niet in een horizontaal scrollende pane: de legenda blijft in beeld bij scrollen.
    let node = legend.parentElement;
    while (node) {
      expect(node.className).not.toContain(container.querySelector('[aria-label="Scroll weeks"]').className);
      node = node.parentElement;
    }
  });

  it('only shows the hover-only resize divider when onChartHeightChange is passed', () => {
    const withoutHandle = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        compact
        chartHeight={180}
      />,
    );
    expect(withoutHandle.container.querySelector('[role="separator"]')).toBeNull();

    const withHandle = renderWithFluent(
      <RccpChartMatrixPanel
        chart={chart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        compact
        chartHeight={180}
        onChartHeightChange={() => {}}
      />,
    );
    const handle = withHandle.container.querySelector('[role="separator"]');
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('aria-label')).toBe('Resize chart height');
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
