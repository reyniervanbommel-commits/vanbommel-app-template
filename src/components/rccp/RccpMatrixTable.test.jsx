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
