import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PO_TABLE_ZOOM_CSS_VAR,
  resetPoTableZoomStoreForTests,
  setPoTableZoom,
} from '../utils/poTableZoom';
import { usePoTableZoomNode } from './usePoTableZoomNode';

afterEach(() => {
  resetPoTableZoomStoreForTests();
});

describe('usePoTableZoomNode', () => {
  it('applies the CSS variable and updates when the store changes', () => {
    const el = document.createElement('div');
    const { result, unmount } = renderHook(() => usePoTableZoomNode());

    result.current(el);
    expect(el.style.getPropertyValue(PO_TABLE_ZOOM_CSS_VAR)).toBe('0.85');

    setPoTableZoom(1);
    expect(el.style.getPropertyValue(PO_TABLE_ZOOM_CSS_VAR)).toBe('1');

    unmount();
    setPoTableZoom(0.75);
    expect(el.style.getPropertyValue(PO_TABLE_ZOOM_CSS_VAR)).toBe('1');
  });
});
