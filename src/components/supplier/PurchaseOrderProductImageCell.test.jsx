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

  it('bouwt een same-origin URL met Nederlandse toegankelijke labels', () => {
    const openImage = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM/1', additionalItemCount: 2 });

    const imageButton = screen.getByRole('button', {
      name: 'Toon productafbeelding van ITEM/1',
    });
    const imageUrl = '/api/media/product-image?dataAreaId=NL01&itemNumber=ITEM%2F1';
    expect(screen.getByAltText('Productafbeelding van ITEM/1').getAttribute('src')).toBe(imageUrl);
    expect(screen.getByRole('button', {
      name: 'Toon productafbeelding van ITEM/1 en 2 overige unieke artikelen',
    })).toBeTruthy();

    fireEvent.click(imageButton);
    expect(openImage).toHaveBeenCalledWith(imageUrl, '_blank', 'noopener,noreferrer');
  });

  it('toont niets zonder itemnummer', () => {
    const { container } = renderCell({ dataAreaId: 'NL01', itemNumber: ' ' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('verbergt een mislukte afbeelding zonder broken-image-icoon', () => {
    const openImage = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCell({ dataAreaId: 'NL01', itemNumber: 'ITEM-1', additionalItemCount: 2 });
    fireEvent.error(screen.getByAltText('Productafbeelding van ITEM-1'));

    expect(screen.queryByAltText('Productafbeelding van ITEM-1')).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Toon productafbeelding van ITEM-1',
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Toon productafbeelding van ITEM-1 en 2 overige unieke artikelen',
    })).toBeNull();
    fireEvent.click(screen.getByText('+2'));
    expect(openImage).not.toHaveBeenCalled();
  });
});
