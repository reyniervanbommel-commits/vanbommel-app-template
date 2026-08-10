'use strict';

const { restrictSupplierDataAccess } = require('./dataAccess');
const { createMockReq, createMockRes, createMockNext } = require('../test-utils/mockRequest');

function callMiddleware(overrides) {
  const req = createMockReq(overrides);
  const res = createMockRes();
  const next = createMockNext();
  restrictSupplierDataAccess(req, res, next);
  return { req, res, next };
}

describe('restrictSupplierDataAccess', () => {
  it('weigert zonder req.user met 401', () => {
    const { res, next } = callMiddleware({ user: null, path: '/purchase-orders', method: 'GET' });
    expect(res.statusCode).toBe(401);
    expect(next.calls).toHaveLength(0);
  });

  it('laat admin altijd door, ongeacht het pad', () => {
    const { next } = callMiddleware({ user: { role: 'admin' }, path: '/anything', method: 'DELETE' });
    expect(next.calls).toHaveLength(1);
  });

  it('laat employee altijd door, ongeacht het pad', () => {
    const { next } = callMiddleware({ user: { role: 'employee' }, path: '/anything', method: 'DELETE' });
    expect(next.calls).toHaveLength(1);
  });

  it('laat supplier GET op /purchase-orders door', () => {
    const { next } = callMiddleware({ user: { role: 'supplier' }, path: '/purchase-orders', method: 'GET' });
    expect(next.calls).toHaveLength(1);
  });

  it('laat supplier GET op /purchase-orders/columns door', () => {
    const { next } = callMiddleware({ user: { role: 'supplier' }, path: '/purchase-orders/columns', method: 'GET' });
    expect(next.calls).toHaveLength(1);
  });

  it.each(['/purchase-orders/history', '/purchase-orders/remarks/summary', '/purchase-orders/remarks', '/purchase-orders/activity'])(
    'laat supplier GET op %s door',
    (path) => {
      const { next } = callMiddleware({ user: { role: 'supplier' }, path, method: 'GET' });
      expect(next.calls).toHaveLength(1);
    },
  );

  it('laat supplier PUT op een reaction-toggle door', () => {
    const { next } = callMiddleware({
      user: { role: 'supplier' },
      path: '/purchase-orders/remarks/42/reaction',
      method: 'PUT',
    });
    expect(next.calls).toHaveLength(1);
  });

  it('weigert supplier PUT op een niet-reaction pad met 403', () => {
    const { res, next } = callMiddleware({
      user: { role: 'supplier' },
      path: '/purchase-orders/remarks/42',
      method: 'PUT',
    });
    expect(res.statusCode).toBe(403);
    expect(next.calls).toHaveLength(0);
  });

  it('weigert supplier POST op /purchase-orders met 403 (geen schrijftoegang)', () => {
    const { res, next } = callMiddleware({ user: { role: 'supplier' }, path: '/purchase-orders', method: 'POST' });
    expect(res.statusCode).toBe(403);
    expect(next.calls).toHaveLength(0);
  });

  it('weigert supplier op een volledig ander tabelpad met 403', () => {
    const { res, next } = callMiddleware({ user: { role: 'supplier' }, path: '/vendors', method: 'GET' });
    expect(res.statusCode).toBe(403);
    expect(next.calls).toHaveLength(0);
  });

  it('normaliseert een trailing slash voordat het pad gematcht wordt', () => {
    const { next } = callMiddleware({ user: { role: 'supplier' }, path: '/purchase-orders/', method: 'GET' });
    expect(next.calls).toHaveLength(1);
  });
});
