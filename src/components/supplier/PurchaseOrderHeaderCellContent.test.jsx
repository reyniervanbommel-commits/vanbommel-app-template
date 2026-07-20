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
});
