import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import { createProductImageColumn } from '../../utils/purchaseOrderProductImageColumn';

function renderHeaderCell(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderHeaderCellContent {...props} />
    </FluentProvider>
  );
}

describe('PurchaseOrderHeaderCellContent', () => {
  // De samenvatting komt sinds de lazy-lines-payload als rollup uit de board-read;
  // de cel berekent zelf niets meer over de sublijnen.
  it('renders the product image column from the rollup summary', () => {
    renderHeaderCell({
      order: {
        dataAreaId: 'nl01',
        orderNumber: 'PO-1',
        values: { status: 'Open' },
      },
      column: createProductImageColumn('header'),
      productImageSummary: { firstItemNumber: 'VISIBLE-ITEM', additionalItemCount: 0 },
    });

    expect(screen.getByAltText('Product image for VISIBLE-ITEM')).toBeTruthy();
    expect(screen.queryByAltText('Product image for HIDDEN-ITEM')).toBeNull();
  });

  // Zelfde "+N"-badgepatroon als de productafbeelding, maar dan voor elke kolom die via
  // "Push values to header column" naar de header is gekoppeld.
  it('renders the first linked value with a "+N" badge when there are more unique values', () => {
    renderHeaderCell({
      order: {
        dataAreaId: 'nl01',
        orderNumber: 'PO-1',
        values: { colorValues: 'Red, Blue, Green' },
        linkedLineValues: { colorValues: ['Red', 'Blue', 'Green'] },
      },
      column: { key: 'colorValues', label: 'Color Values', dataType: 'text', source: 'custom' },
      linkedLineValueMap: { colorValues: { lineColumnKey: 'color', lineDataType: 'text' } },
    });

    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.getByLabelText('2 additional unique values')).toBeTruthy();
  });

  it('renders the linked value without a badge when there is only one unique value', () => {
    renderHeaderCell({
      order: {
        dataAreaId: 'nl01',
        orderNumber: 'PO-1',
        values: { colorValues: 'Red' },
        linkedLineValues: { colorValues: ['Red', 'Red'] },
      },
      column: { key: 'colorValues', label: 'Color Values', dataType: 'text', source: 'custom' },
      linkedLineValueMap: { colorValues: { lineColumnKey: 'color', lineDataType: 'text' } },
    });

    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.queryByLabelText(/additional unique values/)).toBeNull();
  });
});
