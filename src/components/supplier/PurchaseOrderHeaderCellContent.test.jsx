import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';

describe('PurchaseOrderHeaderCellContent', () => {
  it('selects the header preview from the active visible line set', () => {
    render(
      <PurchaseOrderHeaderCellContent
        order={{
          dataAreaId: 'nl01',
          orderNumber: 'PO-1',
          values: { status: 'Open' },
          lines: [
            { values: { itemNumber: 'HIDDEN-ITEM' } },
            { values: { itemNumber: 'VISIBLE-ITEM' } },
          ],
        }}
        column={{ key: 'status', source: 'd365', dataType: 'text' }}
        productImageLines={[{ values: { itemNumber: 'VISIBLE-ITEM' } }]}
        showProductImagePreview
      />
    );

    expect(screen.getByAltText('Productafbeelding van VISIBLE-ITEM')).toBeTruthy();
    expect(screen.queryByAltText('Productafbeelding van HIDDEN-ITEM')).toBeNull();
  });
});
