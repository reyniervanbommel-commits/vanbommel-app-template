import { describe, expect, it } from 'vitest';
import { HEX_COLOR_PATTERN, getRgbHex, isHexColor, normalizeHexColor } from './hexColor.js';

describe('hexColor (server)', () => {
  it('accepteert 6- en 8-cijferige hex', () => {
    expect(isHexColor('#e2445c')).toBe(true);
    expect(isHexColor('#e2445cb3')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(HEX_COLOR_PATTERN.test('#00c87580')).toBe(true);
  });

  it('normaliseert en haalt RGB eruit', () => {
    expect(normalizeHexColor('#AABB11B3')).toBe('#aabb11b3');
    expect(getRgbHex('#e2445cb3')).toBe('#e2445c');
    expect(normalizeHexColor('niet-hex')).toBe('');
  });
});
