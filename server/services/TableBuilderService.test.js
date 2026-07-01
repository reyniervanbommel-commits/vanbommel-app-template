'use strict';

// DB-vrije unit-tests voor de pure helper resolveDiscoverRelation (#139): de detailSourceEntity-tak
// van discoverFields. Bepaalt of de detail-velddiscovery de opgeslagen relatie gebruikt of de door de
// frontend meegegeven detail-entiteit (VÓÓRDAT de relatie is opgeslagen).

const { resolveDiscoverRelation } = require('./TableBuilderService');

describe('resolveDiscoverRelation — detailSourceEntity-tak', () => {
  const stored = { detailSourceEntity: 'OpgeslagenLines', kind: 'expand', detailKeyFields: 'LineNumber' };

  it('gebruikt de meegegeven detailSourceEntity (kind expand) i.p.v. de opgeslagen relatie', () => {
    const rel = resolveDiscoverRelation(stored, 'PurchaseOrderLines');
    expect(rel).toEqual({ detailSourceEntity: 'PurchaseOrderLines', kind: 'expand' });
  });

  it('valt terug op de opgeslagen relatie als er geen detailSourceEntity is', () => {
    expect(resolveDiscoverRelation(stored, undefined)).toBe(stored);
    expect(resolveDiscoverRelation(stored, '')).toBe(stored);
    expect(resolveDiscoverRelation(stored, '   ')).toBe(stored);
  });

  it('geeft null als er geen override en geen opgeslagen relatie is', () => {
    expect(resolveDiscoverRelation(null, undefined)).toBeNull();
    expect(resolveDiscoverRelation(undefined, '')).toBeNull();
  });

  it('trimt de meegegeven detail-entiteit', () => {
    const rel = resolveDiscoverRelation(null, '  PurchaseOrderLines  ');
    expect(rel).toEqual({ detailSourceEntity: 'PurchaseOrderLines', kind: 'expand' });
  });
});
