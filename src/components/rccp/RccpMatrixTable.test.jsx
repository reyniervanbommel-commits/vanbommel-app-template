// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import RccpMatrixTable from './RccpMatrixTable';
import { RCCP_CAPACITY_MEASURE_KEY } from './rccpUtils';

const periods = [{ key: '2026-W10', year: 2026, week: 10 }];

const measureRows = [
  { measureKey: 'ordered', label: 'Quantity', isOrdered: true },
  { measureKey: 'received', label: 'Received', isDelivered: true },
  { measureKey: RCCP_CAPACITY_MEASURE_KEY, label: 'Available capacity', isCapacity: true },
];

const periodsTwoWeeks = [
  { key: '2026-W10', year: 2026, week: 10 },
  { key: '2026-W11', year: 2026, week: 11 },
];

const cellMap = new Map([
  ['ordered|2026|10', { confirmedQty: 5, availableQty: 10, statusColor: 'green' }],
  ['received|2026|10', { confirmedQty: 5, availableQty: 10, statusColor: 'green' }],
  [`${RCCP_CAPACITY_MEASURE_KEY}|2026|10`, { confirmedQty: 0, availableQty: 0, statusColor: 'grey' }],
]);

function rowFor(container, rowLabel) {
  return [...container.querySelectorAll('tr')]
    .find((tr) => tr.textContent.includes(rowLabel));
}

function cellFor(container, rowLabel, colIndex = 1) {
  return rowFor(container, rowLabel)?.querySelectorAll('td')[colIndex];
}

describe('RccpMatrixTable', () => {
  it('colors only the Quantity (isOrdered) row when color fill is enabled', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        colorFillEnabled
      />,
    );
    expect(cellFor(container, 'Quantity').style.backgroundColor).not.toBe('');
    expect(cellFor(container, 'Quantity').style.backgroundColor)
      .not.toBe(cellFor(container, 'Received').style.backgroundColor);
  });

  it('gives Received/Remaining the standard grey background when the cell has a value', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        colorFillEnabled
      />,
    );
    expect(cellFor(container, 'Received').style.backgroundColor).not.toBe('');
  });

  it('never applies status colors to the Quantity row when color fill is disabled', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        colorFillEnabled={false}
      />,
    );
    // With color fill off, Quantity falls back to the same neutral grey as Received
    // (based on having a value), not a status color.
    expect(cellFor(container, 'Quantity').style.backgroundColor)
      .toBe(cellFor(container, 'Received').style.backgroundColor);
  });

  it('leaves empty cells blank, except a dash for a zero-capacity week', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
      />,
    );
    expect(cellFor(container, 'Available capacity').textContent).toBe('-');
  });

  it('keeps a zero-capacity (dash) cell white and colors a real-capacity cell grey', () => {
    const cellMapWithCapacity = new Map(cellMap);
    cellMapWithCapacity.set(`${RCCP_CAPACITY_MEASURE_KEY}|2026|10`, {
      confirmedQty: 0, availableQty: 8, statusColor: 'grey',
    });
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMapWithCapacity}
      />,
    );
    expect(cellFor(container, 'Available capacity').style.backgroundColor).not.toBe('');
    expect(cellFor(container, 'Available capacity').textContent).toBe('8');
  });

  it('keeps a valueless Quantity cell white even when color fill is enabled', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periodsTwoWeeks}
        cellMap={cellMap}
        colorFillEnabled
      />,
    );
    // Week 11 has no 'ordered' cell in cellMap, so it's a valueless (empty) week.
    expect(cellFor(container, 'Quantity', 2).style.backgroundColor).toBe('');
    expect(cellFor(container, 'Quantity', 2).textContent).toBe('');
  });
});

describe('RccpMatrixTable load-date markers', () => {
  const loadDateRows = [
    { measureKey: 'ordered', label: 'Quantity', isOrdered: true },
    { measureKey: 'open', label: 'Remaining', isOpen: true },
    { measureKey: RCCP_CAPACITY_MEASURE_KEY, label: 'Available capacity', isCapacity: true },
  ];
  const requestedCells = new Map([
    ['ordered|2026|10', { confirmedQty: 120, availableQty: 200, statusColor: 'green' }],
    ['open|2026|10', { confirmedQty: 40, availableQty: 200, statusColor: 'green' }],
  ]);
  const confirmedCells = new Map([
    ['ordered|2026|10', { confirmedQty: 80, availableQty: 200, statusColor: 'green' }],
  ]);

  it('marks a single active load date with its superscript', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={loadDateRows}
        periods={periods}
        cellMap={requestedCells}
        planningDateModes="requested"
      />,
    );
    expect(cellFor(container, 'Quantity').textContent).toBe('120R');
    expect(cellFor(container, 'Remaining').textContent).toBe('40R');
    expect(cellFor(container, 'Available capacity').textContent).toBe('-');
  });

  it('stacks both load dates: requested first, confirmed after it', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={loadDateRows}
        periods={periods}
        cellMap={requestedCells}
        cellMapSecondary={confirmedCells}
        planningDateModes={{ requested: true, confirmed: true }}
      />,
    );
    // Requested linksboven, confirmed rechtsonder — twee regels, geen scheidingsteken.
    const cell = cellFor(container, 'Quantity');
    expect(cell.textContent).toBe('120R80C');
    const lines = cell.querySelectorAll('span > span.fui-text, span > span');
    expect(cell.textContent.indexOf('120R')).toBeLessThan(cell.textContent.indexOf('80C'));
    expect(lines.length).toBeGreaterThan(1);
  });

  it('shows only the load date that has a value in that period', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={loadDateRows}
        periods={periods}
        cellMap={requestedCells}
        cellMapSecondary={confirmedCells}
        planningDateModes={{ requested: true, confirmed: true }}
      />,
    );
    expect(cellFor(container, 'Remaining').textContent).toBe('40R');
  });
});

describe('RccpMatrixTable row visibility', () => {
  it('greys out a row that is toggled off in the chart', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        visibleKeys={{ ordered: false, received: true, [RCCP_CAPACITY_MEASURE_KEY]: true }}
        colorFillEnabled
      />,
    );
    const hidden = cellFor(container, 'Quantity');
    // Waarde blijft leesbaar, maar grijs en zonder statuskleur — de reeks staat uit.
    expect(hidden.textContent).not.toBe('');
    expect(hidden.style.backgroundColor).toBe('');
    expect(hidden.querySelector('span').className)
      .not.toBe(cellFor(container, 'Received').querySelector('span').className);
  });

  it('keeps values for rows without an explicit toggle state', () => {
    const { container } = renderWithFluent(
      <RccpMatrixTable
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        visibleKeys={{}}
        colorFillEnabled
      />,
    );
    expect(cellFor(container, 'Quantity').textContent).not.toBe('');
  });
});
