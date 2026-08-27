import { describe, expect, it } from 'vitest';
import { rccpItemColor, RCCP_ITEM_PALETTE } from './rccpItemColor';

describe('rccpItemColor', () => {
  it('never returns #D13438 or the open measure color', () => {
    expect(RCCP_ITEM_PALETTE.map((c) => c.toLowerCase())).not.toContain('#d13438');
    for (let i = 0; i < 40; i += 1) {
      const color = rccpItemColor(`SKU-${i}`, { openColor: '#0078D4' });
      expect(color.toLowerCase()).not.toBe('#d13438');
      expect(color.toLowerCase()).not.toBe('#0078d4');
    }
  });

  it('is stable for the same item number', () => {
    expect(rccpItemColor('CFM-1', { openColor: '#D13438' }))
      .toBe(rccpItemColor('CFM-1', { openColor: '#D13438' }));
  });
});
