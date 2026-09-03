'use strict';

const express = require('express');
const poTableZoomSettings = require('../services/PoTableZoomSettings');

const originalGetZoom = poTableZoomSettings.getZoom;
const originalSetZoom = poTableZoomSettings.setZoom;

afterEach(() => {
  poTableZoomSettings.getZoom = originalGetZoom;
  poTableZoomSettings.setZoom = originalSetZoom;
});

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/admin', require('./admin'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

async function withServer(user, fn) {
  const app = buildApp(user);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('GET /api/admin/settings/general', () => {
  it('leest de zoom van de ingelogde gebruiker', async () => {
    poTableZoomSettings.getZoom = vi.fn().mockResolvedValue(0.9);
    await withServer({ id: 2, role: 'employee' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/settings/general`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ poTableZoom: 0.9 });
    });
    expect(poTableZoomSettings.getZoom).toHaveBeenCalledWith(2);
  });
});

describe('PATCH /api/admin/settings/general', () => {
  it('laat employee de eigen zoom opslaan', async () => {
    poTableZoomSettings.setZoom = vi.fn().mockResolvedValue(1);
    await withServer({ id: 2, role: 'employee', email: 'e@b.com' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/settings/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poTableZoom: 1 }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, poTableZoom: 1 });
    });
    expect(poTableZoomSettings.setZoom).toHaveBeenCalledWith(1, 2);
  });

  it('geeft 400 zonder poTableZoom', async () => {
    await withServer({ id: 1, role: 'admin', email: 'a@b.com' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/settings/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  it('laat admin de zoom opslaan', async () => {
    poTableZoomSettings.setZoom = vi.fn().mockResolvedValue(1);
    await withServer({ id: 1, role: 'admin', email: 'a@b.com' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/settings/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poTableZoom: 1 }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, poTableZoom: 1 });
    });
    expect(poTableZoomSettings.setZoom).toHaveBeenCalledWith(1, 1);
  });
});
