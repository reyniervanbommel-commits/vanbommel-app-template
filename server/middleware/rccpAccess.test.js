'use strict';

const { rccpAccess, resolveVendorQuery, resolveSupplierAccount } = require('./rccpAccess');
const { createMockReq, createMockRes, createMockNext } = require('../test-utils/mockRequest');

function callMiddleware(overrides) {
  const req = createMockReq(overrides);
  const res = createMockRes();
  const next = createMockNext();
  rccpAccess(req, res, next);
  return { req, res, next };
}

describe('rccpAccess', () => {
  it('weigert zonder req.user met 401', () => {
    const { res, next } = callMiddleware({ user: null });
    expect(res.statusCode).toBe(401);
    expect(next.calls).toHaveLength(0);
  });

  it('laat staff (admin) door met isStaff scope en zonder vendor-lock', () => {
    const { req, next } = callMiddleware({ user: { role: 'admin' } });
    expect(next.calls).toHaveLength(1);
    expect(req.rccpScope).toEqual({ isStaff: true, vendorAccount: null, readOnly: false });
  });

  it('laat staff (employee) door', () => {
    const { next } = callMiddleware({ user: { role: 'employee' } });
    expect(next.calls).toHaveLength(1);
  });

  it('laat supplier GET door, scopet naar het eigen vendorAccount, read-only', () => {
    const { req, next } = callMiddleware({
      user: { role: 'supplier', vendorAccount: 'V000583' },
      method: 'GET',
    });
    expect(next.calls).toHaveLength(1);
    expect(req.rccpScope).toEqual({ isStaff: false, vendorAccount: 'V000583', readOnly: true });
  });

  it('laat supplier HEAD door', () => {
    const { next } = callMiddleware({ user: { role: 'supplier', vendorAccount: 'V000583' }, method: 'HEAD' });
    expect(next.calls).toHaveLength(1);
  });

  it('weigert supplier POST/PUT/DELETE met 403, ook al is de vendor-scope al gezet', () => {
    const { res, next } = callMiddleware({ user: { role: 'supplier', vendorAccount: 'V000583' }, method: 'POST' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Suppliers have read-only RCCP access');
    expect(next.calls).toHaveLength(0);
  });

  it('weigert een onbekende rol met 403', () => {
    const { res, next } = callMiddleware({ user: { role: 'unknown' } });
    expect(res.statusCode).toBe(403);
    expect(next.calls).toHaveLength(0);
  });
});

describe('resolveVendorQuery', () => {
  it('geeft de vendorAccount uit rccpScope terug als die er is (supplier-lock wint)', () => {
    const req = createMockReq({ rccpScope: { vendorAccount: 'V000583' }, query: { vendorAccount: 'V999999' } });
    expect(resolveVendorQuery(req)).toBe('V000583');
  });

  it('valt terug op query.vendorAccount voor staff (geen scope-lock)', () => {
    const req = createMockReq({ rccpScope: { vendorAccount: null }, query: { vendorAccount: ' V000696 ' } });
    expect(resolveVendorQuery(req)).toBe('V000696');
  });

  it('valt terug op query.vendor als vendorAccount ontbreekt', () => {
    const req = createMockReq({ rccpScope: {}, query: { vendor: 'V000123' } });
    expect(resolveVendorQuery(req)).toBe('V000123');
  });

  it('geeft null zonder scope en zonder query', () => {
    const req = createMockReq({ query: {} });
    expect(resolveVendorQuery(req)).toBeNull();
  });
});

describe('resolveSupplierAccount', () => {
  it('geeft de gescopete vendorAccount terug', () => {
    const req = createMockReq({ rccpScope: { vendorAccount: 'V000583' } });
    expect(resolveSupplierAccount(req)).toBe('V000583');
  });

  it('geeft null voor staff zonder vendor-lock', () => {
    const req = createMockReq({ rccpScope: { vendorAccount: null } });
    expect(resolveSupplierAccount(req)).toBeNull();
  });
});
