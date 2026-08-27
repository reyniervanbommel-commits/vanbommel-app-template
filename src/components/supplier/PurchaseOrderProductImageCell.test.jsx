// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { PRODUCT_IMAGE_LOAD_DELAY_MS } from '../../utils/purchaseOrderProductImageColumn';
import { resetProductImageFailureCache } from '../../utils/productImageFailureCache';

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
    vi.useRealTimers();
    resetProductImageFailureCache();
  });

  it('builds a same-origin URL with accessible English labels', async () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM/1', additionalItemCount: 2 });

    const imageButton = screen.getByRole('button', {
      name: 'Show product image for ITEM/1',
    });
    const imageUrl = '/api/media/product-image?dataAreaId=NL01&itemNumber=ITEM%2F1';
    // The <img> only mounts after the load-settle delay (debounced against fast scrolling).
    expect((await screen.findByAltText('Product image for ITEM/1')).getAttribute('src')).toBe(imageUrl);
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

  it('does not mount the image immediately — only after the load-settle delay', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-3' });
    // A row that is scrolled straight past unmounts again before this point,
    // so no fetch should have started yet.
    expect(screen.queryByAltText('Product image for ITEM-3')).toBeNull();
  });

  it('hides a failed image without a broken-image icon', async () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', additionalItemCount: 2 });
    fireEvent.error(await screen.findByAltText('Product image for ITEM-1'));

    expect(screen.queryByAltText('Product image for ITEM-1')).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1',
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-1 and 2 additional unique items',
    })).toBeNull();
  });

  it('does not retry a fetch for an image that already failed on a previous mount', async () => {
    const { unmount } = renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-2' });
    fireEvent.error(await screen.findByAltText('Product image for ITEM-2'));
    expect(screen.queryByAltText('Product image for ITEM-2')).toBeNull();
    unmount();

    // Simulates the board virtualization remounting the same row after scrolling
    // it out of view and back in — the cell must not attempt the fetch again.
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-2' });
    expect(screen.queryByAltText('Product image for ITEM-2')).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Show product image for ITEM-2',
    })).toBeNull();
  });

  it('uses a transparent button background when conditional formatting is active', () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', isConditionalFormat: true });

    const imageButton = screen.getByRole('button', { name: 'Show product image for ITEM-1' });
    expect(window.getComputedStyle(imageButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('shows an enlarged hover preview after the hover delay without remounting the trigger', async () => {
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1' });
    const thumbnail = await screen.findByAltText('Product image for ITEM-1');
    const imageButton = screen.getByRole('button', { name: 'Show product image for ITEM-1' });
    const imageUrl = thumbnail.getAttribute('src');

    vi.useFakeTimers();
    fireEvent.mouseEnter(imageButton);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRODUCT_IMAGE_LOAD_DELAY_MS);
    });

    const imagesWithSrc = () => [...document.querySelectorAll('img')]
      .filter((img) => img.getAttribute('src') === imageUrl);
    expect(imagesWithSrc()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Show product image for ITEM-1' })).toBe(imageButton);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('ITEM-1');
    expect(tooltip.closest('[data-portal-node="true"]')).toBeTruthy();
    const tooltipBackground = window.getComputedStyle(tooltip).backgroundColor;
    expect(tooltipBackground).not.toBe('');
    expect(tooltipBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(tooltipBackground).not.toBe('transparent');

    fireEvent.mouseLeave(imageButton);
    expect(imagesWithSrc()).toHaveLength(1);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
