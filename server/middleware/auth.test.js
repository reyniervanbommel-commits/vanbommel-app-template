'use strict';

const { requireSession, requireRole, requireAnyRole } = require('./auth');
const { createMockReq, createMockRes, createMockNext } = require('../test-utils/mockRequest');

describe('requireSession', () => {
  it('zet req.user en roept next() bij een geldige sessie', () => {
    const req = createMockReq({ session: { userId: 1, user: { id: 1, role: 'employee' } } });
    const res = createMockRes();
    const next = createMockNext();

    requireSession(req, res, next);

    expect(next.calls).toHaveLength(1);
    expect(req.user).toEqual({ id: 1, role: 'employee' });
  });

  it('geeft 401 zonder sessie', () => {
    const req = createMockReq({ session: null });
    const res = createMockRes();
    const next = createMockNext();

    requireSession(req, res, next);

    expect(next.calls).toHaveLength(0);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
  });

  it('geeft 401 bij een sessie zonder userId', () => {
    const req = createMockReq({ session: { user: { id: 1 } } });
    const res = createMockRes();
    const next = createMockNext();

    requireSession(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next.calls).toHaveLength(0);
  });
});

describe('requireRole', () => {
  it('laat de exacte rol door', () => {
    const req = createMockReq({ user: { role: 'employee' } });
    const res = createMockRes();
    const next = createMockNext();

    requireRole('employee')(req, res, next);

    expect(next.calls).toHaveLength(1);
  });

  it('laat admin altijd door, ongeacht de gevraagde rol', () => {
    const req = createMockReq({ user: { role: 'admin' } });
    const res = createMockRes();
    const next = createMockNext();

    requireRole('supplier')(req, res, next);

    expect(next.calls).toHaveLength(1);
  });

  it('weigert een andere rol met 403', () => {
    const req = createMockReq({ user: { role: 'supplier' } });
    const res = createMockRes();
    const next = createMockNext();

    requireRole('employee')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('employee role required');
    expect(next.calls).toHaveLength(0);
  });

  it('weigert zonder req.user met 401', () => {
    const req = createMockReq({ user: null });
    const res = createMockRes();
    const next = createMockNext();

    requireRole('employee')(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next.calls).toHaveLength(0);
  });
});

describe('requireAnyRole', () => {
  it('laat een van de toegestane rollen door', () => {
    const req = createMockReq({ user: { role: 'supplier' } });
    const res = createMockRes();
    const next = createMockNext();

    requireAnyRole(['supplier', 'employee'])(req, res, next);

    expect(next.calls).toHaveLength(1);
  });

  it('laat admin altijd door, ook als admin niet in de lijst staat', () => {
    const req = createMockReq({ user: { role: 'admin' } });
    const res = createMockRes();
    const next = createMockNext();

    requireAnyRole(['supplier'])(req, res, next);

    expect(next.calls).toHaveLength(1);
  });

  it('weigert een rol buiten de lijst met 403', () => {
    const req = createMockReq({ user: { role: 'supplier' } });
    const res = createMockRes();
    const next = createMockNext();

    requireAnyRole(['employee'])(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next.calls).toHaveLength(0);
  });

  it('weigert zonder req.user met 401', () => {
    const req = createMockReq({ user: null });
    const res = createMockRes();
    const next = createMockNext();

    requireAnyRole(['employee'])(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next.calls).toHaveLength(0);
  });
});
