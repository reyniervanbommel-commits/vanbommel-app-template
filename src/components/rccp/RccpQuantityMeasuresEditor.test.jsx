// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpQuantityMeasuresEditor from './RccpQuantityMeasuresEditor';

const columns = [
  { key: 'openQty', label: 'remaining qty (Ontvangstregels)', dataType: 'number', isActive: true },
  { key: 'receivedQty', label: 'receivedPurchaseQuantity', dataType: 'number', isActive: true },
];

const measures = [
  { columnKey: 'openQty', label: 'remaining qty (Ontvangstregels)', chartType: 'bar', color: '#D13438', showInChart: true },
  { columnKey: 'receivedQty', label: 'receivedPurchaseQuantity', chartType: 'bar', color: '#107C10', showInChart: true },
];

function renderEditor(onChange) {
  return renderWithFluent(
    <RccpQuantityMeasuresEditor
      measures={measures}
      columns={columns}
      openMeasureKey="openQty"
      deliveredMeasureKey="receivedQty"
      orderedMeasureKey="openQty"
      onChange={onChange}
      onUpdateField={vi.fn()}
    />,
  );
}

describe('RccpQuantityMeasuresEditor', () => {
  it('shows the chart legend label per slot', () => {
    const { getByLabelText } = renderEditor(vi.fn());
    expect(getByLabelText('Open chart label').value).toBe('remaining qty (Ontvangstregels)');
    expect(getByLabelText('Received chart label').value).toBe('receivedPurchaseQuantity');
  });

  it('lets the user rename the label shown in the chart legend', () => {
    const onChange = vi.fn();
    const { getByLabelText } = renderEditor(onChange);

    fireEvent.change(getByLabelText('Open chart label'), { target: { value: 'Remaining' } });

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0];
    expect(next[0]).toMatchObject({ columnKey: 'openQty', label: 'Remaining' });
    // De andere slots blijven ongemoeid.
    expect(next[1]).toMatchObject({ columnKey: 'receivedQty', label: 'receivedPurchaseQuantity' });
  });
});
