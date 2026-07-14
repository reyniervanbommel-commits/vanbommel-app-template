import { describe, expect, it } from 'vitest';
import {
  computeStickyOffsetsFromWidths,
  measureStickyOffsetsFromTable,
} from './purchaseOrderStickyColumnOffsets';

describe('purchaseOrderStickyColumnOffsets', () => {
  it('computes fallback offsets from configured widths', () => {
    expect(computeStickyOffsetsFromWidths(['order', 'supplier'], { order: 120, supplier: 140 }))
      .toEqual({ order: 92, supplier: 212 });
  });

  it('reads sticky offsets from rendered header cells', () => {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    const control = document.createElement('th');
    control.setAttribute('data-board-control-column', 'true');
    Object.defineProperty(control, 'offsetLeft', { value: 0, configurable: true });
    Object.defineProperty(control, 'offsetWidth', { value: 96, configurable: true });

    const order = document.createElement('th');
    order.setAttribute('data-col-key', 'order');
    Object.defineProperty(order, 'offsetLeft', { value: 96, configurable: true });
    Object.defineProperty(order, 'offsetWidth', { value: 130, configurable: true });

    tr.append(control, order);
    thead.append(tr);
    table.append(thead);
    document.body.append(table);

    expect(measureStickyOffsetsFromTable(table, ['order'])).toEqual({ order: 96 });

    table.remove();
  });
});
