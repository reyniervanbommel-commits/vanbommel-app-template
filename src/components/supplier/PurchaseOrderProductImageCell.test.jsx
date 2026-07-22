// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { useProductImage } from '../../hooks/useProductImage';

vi.mock('../../hooks/useProductImage', () => ({
  useProductImage: vi.fn(),
}));

function renderCell(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderProductImageCell {...props} />
    </FluentProvider>
  );
}

describe('PurchaseOrderProductImageCell', () => {
  beforeEach(() => {
    useProductImage.mockReturnValue({ status: 'loaded', src: 'blob:mock-image' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a same-origin URL and shows the loaded image via the shared loader', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM/1', additionalItemCount: 2 });

    expect(useProductImage).toHaveBeenCalledWith(
      '/api/media/product-image?dataAreaId=NL01&itemNumber=ITEM%2F1'
    );

    const imageButton = screen.getByRole('button', {
      name: 'Show product image for ITEM/1',
    });
    expect(screen.getByAltText('Product image for ITEM/1').getAttribute('src')).toBe('blob:mock-image');
    expect(screen.getByRole('button', {
      name: 'Show product image for ITEM/1 and 2 additional unique items',
    })).toBeTruthy();

    fireEvent.click(imageButton);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('ITEM/1')).toBeTruthy();
    expect(screen.getAllByAltText('Product image for ITEM/1')).toHaveLength(2);
  });

  it('renders nothing without an item number', () => {
    useProductImage.mockReturnValue({ status: 'idle', src: null });
    const { container } = renderCell({ dataAreaId: 'NL01', itemNumber: ' ' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('hides the image without a broken-image icon when the loader reports an error', () => {
    useProductImage.mockReturnValue({ status: 'error', src: null });
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', additionalItemCount: 2 });

    expect(screen.queryByAltText('Product image for ITEM-1')).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1',
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1 and 2 additional unique items',
    })).toBeNull();
  });

  it('shows nothing while the image is still loading', () => {
    useProductImage.mockReturnValue({ status: 'loading', src: null });
    const { container } = renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('uses a transparent button background when conditional formatting is active', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', isConditionalFormat: true });

    const imageButton = screen.getByRole('button', { name: 'Show product image for ITEM-1' });
    expect(window.getComputedStyle(imageButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});
