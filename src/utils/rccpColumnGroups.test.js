import { describe, expect, it } from 'vitest';
import {
  buildRccpColumnOption,
  matchRccpColumn,
  parseRccpColumnRef,
  rccpColumnGroupLabel,
  rccpColumnOptionValue,
} from './rccpColumnGroups';

describe('rccpColumnGroupLabel', () => {
  it('zet native header-kolommen in PO headers', () => {
    expect(rccpColumnGroupLabel({ key: 'requestedDeliveryDate', source: 'source', scope: 'master' }))
      .toBe('PO headers');
    expect(rccpColumnGroupLabel({ key: 'new_formula', source: 'custom' })).toBe('PO headers');
  });

  it('zet native regelkolommen in PO lines', () => {
    expect(rccpColumnGroupLabel({ key: 'requestedDeliveryDate', source: 'source', scope: 'detail' }))
      .toBe('PO lines');
  });

  it('groepeert lookup-kolommen per doeltabel', () => {
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'vendors' },
    })).toBe('Vendors');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'items' },
    })).toBe('Items');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'product-receipt-lines' },
    })).toBe('Receipt lines');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'upload-2' },
    })).toBe('Excel upload');
  });
});

describe('parseRccpColumnRef', () => {
  it('leest een scope-prefix', () => {
    expect(parseRccpColumnRef('detail:requestedDeliveryDate'))
      .toEqual({ scope: 'detail', key: 'requestedDeliveryDate' });
    expect(parseRccpColumnRef('master:vendorAccount'))
      .toEqual({ scope: 'master', key: 'vendorAccount' });
  });

  it('houdt een ongeprefixte key geldig zonder scope', () => {
    expect(parseRccpColumnRef('requestedDeliveryDate'))
      .toEqual({ scope: null, key: 'requestedDeliveryDate' });
  });
});

describe('rccp column options', () => {
  const header = {
    key: 'requestedDeliveryDate',
    label: 'Gevraagde leverdatum',
    scope: 'master',
    source: 'source',
  };
  const line = {
    key: 'requestedDeliveryDate',
    label: 'Gevraagde leverdatum',
    scope: 'detail',
    source: 'source',
  };

  it('maakt unieke option-values per scope', () => {
    expect(rccpColumnOptionValue(header)).toBe('master:requestedDeliveryDate');
    expect(rccpColumnOptionValue(line)).toBe('detail:requestedDeliveryDate');
  });

  it('toont PO header of PO line in het gesloten label', () => {
    expect(buildRccpColumnOption(header).shortText).toBe('Gevraagde leverdatum · PO header');
    expect(buildRccpColumnOption(line).shortText).toBe('Gevraagde leverdatum · PO line');
    expect(buildRccpColumnOption(header).group).toBe('PO headers');
    expect(buildRccpColumnOption(line).group).toBe('PO lines');
  });

  it('kiest bij een ongeprefixte key de regelkolom', () => {
    expect(matchRccpColumn([header, line], 'requestedDeliveryDate')).toEqual(line);
  });

  it('eert een expliciete header-prefix', () => {
    expect(matchRccpColumn([header, line], 'master:requestedDeliveryDate')).toEqual(header);
  });
});
