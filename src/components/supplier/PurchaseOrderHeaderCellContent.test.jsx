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
  it('renders the product image column from the active visible line set', () => {
    renderHeaderCell({
      order: {
        dataAreaId: 'nl01',
        orderNumber: 'PO-1',
        values: { status: 'Open' },
        lines: [
          { values: { itemNumber: 'HIDDEN-ITEM' } },
          { values: { itemNumber: 'VISIBLE-ITEM' } },
        ],
      },
      column: createProductImageColumn('header'),
      productImageLines: [{ values: { itemNumber: 'VISIBLE-ITEM' } }],
    });

    expect(screen.getByAltText('Product image for VISIBLE-ITEM')).toBeTruthy();
    expect(screen.queryByAltText('Product image for HIDDEN-ITEM')).toBeNull();
  });
});
