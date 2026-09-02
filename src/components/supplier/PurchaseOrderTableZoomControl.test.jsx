import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PO_TABLE_ZOOM_DEFAULT,
  getPoTableZoom,
  resetPoTableZoomStoreForTests,
} from '../../utils/poTableZoom';
import PurchaseOrderTableZoomControl from './PurchaseOrderTableZoomControl';

afterEach(() => {
  resetPoTableZoomStoreForTests();
  window.localStorage.clear();
});

describe('PurchaseOrderTableZoomControl', () => {
  it('steps zoom and hides reset at 85%', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderTableZoomControl />
      </FluentProvider>
    );

    expect(screen.queryByRole('button', { name: 'Reset zoom to 85%' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(getPoTableZoom()).toBe(0.9);
    expect(screen.getByRole('button', { name: 'Reset zoom to 85%' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom to 85%' }));
    expect(getPoTableZoom()).toBe(PO_TABLE_ZOOM_DEFAULT);
  });
});
