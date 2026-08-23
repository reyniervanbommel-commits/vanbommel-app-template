import { describe, expect, it } from 'vitest';
import { isRccpQuantityColumn } from './rccpQuantityColumns';

describe('isRccpQuantityColumn', () => {
  it('accepteert een vrijgegeven RCCP-waardekolom', () => {
    expect(isRccpQuantityColumn({ key: 'quantity', scope: 'detail', rccpMeasure: true })).toBe(true);
  });

  it('accepteert header-totalen uit custom- of formulekolommen', () => {
    expect(isRccpQuantityColumn({
      key: 'ordered_qty_ontvangstregels_total',
      scope: 'master',
      source: 'custom',
    })).toBe(true);
    expect(isRccpQuantityColumn({
      key: 'remaining_qty_ontvangstregels_total_2',
      scope: 'master',
      formulaExpr: '[a]+[b]',
    })).toBe(true);
  });

  it('negeert gewone regelkolommen zonder RCCP-vlag', () => {
    expect(isRccpQuantityColumn({ key: 'price', scope: 'detail', source: 'source' })).toBe(false);
  });

  it('negeert inactieve kolommen', () => {
    expect(isRccpQuantityColumn({
      key: 'ordered_qty_ontvangstregels_total',
      scope: 'master',
      source: 'custom',
      isActive: false,
    })).toBe(false);
  });
});
