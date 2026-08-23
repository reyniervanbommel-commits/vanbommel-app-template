import { describe, expect, it } from 'vitest';
import {
  HEX_COLOR_PATTERN,
  applyOpacity,
  blendHexToOpaque,
  getContrastTextColor,
  getOpacityPercent,
  getRgbHex,
  isHexColor,
  normalizeHexColor,
} from './hexColor';

describe('hexColor', () => {
  it('accepteert 6- en 8-cijferige hex, weigert andere waarden', () => {
    expect(isHexColor('#e2445c')).toBe(true);
    expect(isHexColor('#E2445CB3')).toBe(true);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(HEX_COLOR_PATTERN.test('#00c87580')).toBe(true);
  });

  it('normaliseert naar lowercase en laat ongeldige waarden leeg', () => {
    expect(normalizeHexColor('#AABB11')).toBe('#aabb11');
    expect(normalizeHexColor('#AABB11B3')).toBe('#aabb11b3');
    expect(normalizeHexColor('niet-hex')).toBe('');
  });

  it('haalt RGB en opacity-percentage uit een hex-kleur', () => {
    expect(getRgbHex('#e2445cb3')).toBe('#e2445c');
    expect(getRgbHex('#e2445c')).toBe('#e2445c');
    expect(getOpacityPercent('#e2445c')).toBe(100);
    expect(getOpacityPercent('#e2445cb3')).toBe(70);
    expect(getOpacityPercent('')).toBe(100);
  });

  it('past opacity toe: 100% blijft 6 cijfers, lager wordt 8 cijfers', () => {
    expect(applyOpacity('#e2445c', 100)).toBe('#e2445c');
    expect(applyOpacity('#e2445c', 70)).toBe('#e2445cb3');
    expect(applyOpacity('#e2445cff', 40)).toBe('#e2445c66');
    expect(applyOpacity('niet-hex', 50)).toBe('');
  });

  it('behoudt opacity bij een nieuwe RGB-kleur', () => {
    expect(applyOpacity('#00c875', getOpacityPercent('#e2445cb3'))).toBe('#00c875b3');
  });

  it('kiest donkere tekst bij een lichte, doorzichtige achtergrond', () => {
    expect(getContrastTextColor('#e2445c')).toBe('#ffffff');
    expect(getContrastTextColor('#ffcb00')).toBe('#323130');
    expect(getContrastTextColor('#e2445c1a')).toBe('#323130');
  });

  it('mengt een doorzichtige kleur tot een ondoorzichtige tint op wit', () => {
    expect(blendHexToOpaque('#e2445c')).toBe('#e2445c');
    expect(blendHexToOpaque('#e2445cb3')).toBe('#eb7c8d');
    expect(blendHexToOpaque('niet-hex')).toBe('');
  });
});
