// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';

function renderCell(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderProductImageCell {...props} />
    </FluentProvider>
  );
}

describe('PurchaseOrderProductImageCell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a same-origin URL with accessible English labels', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM/1', additionalItemCount: 2 });

    const imageButton = screen.getByRole('button', {
      name: 'Show product image for ITEM/1',
    });
    const imageUrl = '/api/media/product-image?dataAreaId=NL01&itemNumber=ITEM%2F1';
    expect(screen.getByAltText('Product image for ITEM/1').getAttribute('src')).toBe(imageUrl);
    expect(screen.getByRole('button', {
      name: 'Show product image for ITEM/1 and 2 additional unique items',
    })).toBeTruthy();

    fireEvent.click(imageButton);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('ITEM/1')).toBeTruthy();
    expect(screen.getAllByAltText('Product image for ITEM/1')).toHaveLength(2);
  });

  it('renders nothing without an item number', () => {
    const { container } = renderCell({ dataAreaId: 'NL01', itemNumber: ' ' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('hides a failed image without a broken-image icon', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', additionalItemCount: 2 });
    fireEvent.error(screen.getByAltText('Product image for ITEM-1'));

    expect(screen.queryByAltText('Product image for ITEM-1')).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1',
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1 and 2 additional unique items',
    })).toBeNull();
  });

  it('uses a transparent button background when conditional formatting is active', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', isConditionalFormat: true });

    const imageButton = screen.getByRole('button', { name: 'Show product image for ITEM-1' });
    expect(window.getComputedStyle(imageButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});
