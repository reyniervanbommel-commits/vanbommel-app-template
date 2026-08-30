import { describe, expect, it } from 'vitest';
import {
  isRccpDateColumn,
  isRccpQuantityColumn,
  isRccpVendorColumn,
  SLOT_DEFAULT_KEYS,
} from './rccpQuantityColumns';

describe('isRccpQuantityColumn', () => {
  it('accepteert een getalkolom zonder allowlist-vlag', () => {
    expect(isRccpQuantityColumn({
      key: 'quantity', scope: 'detail', dataType: 'number', source: 'source',
    })).toBe(true);
  });

  it('accepteert een formulekolom met getaltype', () => {
    expect(isRccpQuantityColumn({
      key: 'remaining_qty_ontvangstregels_total_2',
      scope: 'master',
      dataType: 'number',
      formulaExpr: '[a]+[b]',
    })).toBe(true);
  });

  it('weiger custom zonder formule', () => {
    expect(isRccpQuantityColumn({
      key: 'ordered_qty_ontvangstregels_total',
      scope: 'master',
      dataType: 'number',
      source: 'custom',
    })).toBe(false);
  });

  it('weiger tekstkolommen', () => {
    expect(isRccpQuantityColumn({ key: 'price', scope: 'detail', source: 'source' })).toBe(false);
  });

  it('negeert inactieve kolommen', () => {
    expect(isRccpQuantityColumn({
      key: 'quantity',
      dataType: 'number',
      isActive: false,
    })).toBe(false);
  });
});

describe('isRccpVendorColumn', () => {
  it('accepteert header-tekst', () => {
    expect(isRccpVendorColumn({ key: 'vendorAccount', dataType: 'text', scope: 'master' })).toBe(true);
  });

  it('weiger datumkolommen', () => {
    expect(isRccpVendorColumn({
      key: 'requestedDeliveryDate', dataType: 'date', scope: 'master',
    })).toBe(false);
  });
});

describe('isRccpDateColumn', () => {
  it('accepteert date en date_period', () => {
    expect(isRccpDateColumn({ key: 'requestedDeliveryDate', dataType: 'date' })).toBe(true);
    expect(isRccpDateColumn({ key: 'period', dataType: 'date_period' })).toBe(true);
  });

  it('weiger artikelnaam', () => {
    expect(isRccpDateColumn({ key: 'itemName', dataType: 'text' })).toBe(false);
  });
});

describe('SLOT_DEFAULT_KEYS', () => {
  it('heeft de vaste mapping-keys', () => {
    expect(SLOT_DEFAULT_KEYS.ordered).toBe('quantity');
    expect(SLOT_DEFAULT_KEYS.confirmed).toBe('confirmedDeliveryDate');
  });
});
