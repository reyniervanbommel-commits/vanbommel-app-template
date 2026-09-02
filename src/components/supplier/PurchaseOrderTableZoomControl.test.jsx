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
  it('exposes the named group and native button titles', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderTableZoomControl />
      </FluentProvider>
    );

    expect(screen.getByRole('group', { name: 'Table zoom' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zoom out' }).getAttribute('title')).toBe('Zoom out');
    expect(screen.getByRole('button', { name: 'Zoom in' }).getAttribute('title')).toBe('Zoom in');
    expect(screen.queryByRole('button', { name: 'Reset zoom to 85%' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Reset zoom to 85%' }).getAttribute('title')).toBe('Reset zoom to 85%');
  });

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

  it('disables zoom out at 75%', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderTableZoomControl />
      </FluentProvider>
    );

    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    fireEvent.click(zoomOut);
    fireEvent.click(zoomOut);

    expect(getPoTableZoom()).toBe(0.75);
    expect(zoomOut.disabled).toBe(true);
  });

  it('disables zoom in at 110%', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderTableZoomControl />
      </FluentProvider>
    );

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);

    expect(getPoTableZoom()).toBe(1.1);
    expect(zoomIn.disabled).toBe(true);
  });
});
