import { describe, expect, it } from 'vitest';
import { resolveColumnMenuFlyoutPlacement } from './columnMenuFlyoutPlacement';

const VIEWPORT = { width: 1280, height: 800 };
const FLYOUT = { width: 240, height: 220 };

describe('resolveColumnMenuFlyoutPlacement', () => {
  it('houdt de flyout rechts als er rechts genoeg ruimte is', () => {
    const parent = { top: 80, left: 200, right: 456 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT, { requestedTop: 40 });
    expect(result.alignLeft).toBe(false);
    expect(result.top).toBe(40);
  });

  it('klapt de flyout naar links als rechts te weinig ruimte is', () => {
    const parent = { top: 80, left: 1000, right: 1256 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT);
    expect(result.alignLeft).toBe(true);
  });

  it('blijft rechts als beide kanten krap zijn maar rechts meer ruimte heeft', () => {
    const parent = { top: 80, left: 40, right: 1160 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT);
    expect(result.alignLeft).toBe(false);
  });

  it('schuift de flyout omhoog als die onderaan het scherm uitsteekt', () => {
    const parent = { top: 620, left: 200, right: 456 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT, { requestedTop: 80 });
    expect(result.alignLeft).toBe(false);
    expect(result.top).toBe(800 - 8 - 620 - 220);
  });

  it('houdt de flyout onder de bovenrand van het scherm', () => {
    const parent = { top: 4, left: 200, right: 456 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT, { requestedTop: -20 });
    expect(result.top).toBe(8 - 4);
  });

  it('laat top weg als requestedTop ontbreekt', () => {
    const parent = { top: 80, left: 200, right: 456 };
    const result = resolveColumnMenuFlyoutPlacement(FLYOUT, parent, VIEWPORT);
    expect(result).toEqual({ alignLeft: false });
  });
});
