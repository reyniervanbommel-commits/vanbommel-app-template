import { describe, expect, it } from 'vitest';
import {
  getColumnCellStyle,
  getFormattedCellContentStyle,
  getFormattedTextColor,
} from './columnTextStyleUtils';

describe('columnTextStyleUtils', () => {
  it('zet een 8-cijferige achtergrondkleur op de cel', () => {
    const style = getColumnCellStyle({}, {}, 'amount', '#e2445cb3');
    expect(style.backgroundColor).toBe('#e2445cb3');
  });

  it('houdt witte tekst bij ondoorzichtige opmaak en donkere tekst bij lichte opacity', () => {
    expect(getFormattedTextColor('#e2445c')).toBe('#ffffff');
    expect(getFormattedTextColor('#e2445c1a')).toBe('#323130');
  });

  it('zet contrast-tekst op formatted content bij een doorzichtige kleur', () => {
    const style = getFormattedCellContentStyle(true, '#e2445c1a');
    expect(style.color).toBe('#323130');
  });
});
