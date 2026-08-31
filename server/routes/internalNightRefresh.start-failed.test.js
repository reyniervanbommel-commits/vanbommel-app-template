'use strict';

const express = require('express');

vi.mock('../services/NightRefreshWekkerAlert', () => ({
  handleStartFailed: vi.fn((req, res) => res.status(202).json({ sent: false })),
}));

const originalEnv = {
  APP_ENV: process.env.APP_ENV,
  NIGHT_REFRESH_TOKEN: process.env.NIGHT_REFRESH_TOKEN,
};

const TOKEN = 'n'.repeat(32);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/internal/night-refresh', require('./internalNightRefresh'));
  return app;
}

async function withServer(fn) {
  const app = buildApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('POST /api/internal/night-refresh/start-failed', () => {
  beforeEach(() => {
    process.env.APP_ENV = 'production';
    process.env.NIGHT_REFRESH_TOKEN = TOKEN;
  });

  afterAll(() => {
    process.env.APP_ENV = originalEnv.APP_ENV;
    process.env.NIGHT_REFRESH_TOKEN = originalEnv.NIGHT_REFRESH_TOKEN;
  });

  it('weigert zonder token', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/internal/night-refresh/start-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ httpStatus: 503, message: 'down' }),
      });
      expect(res.status).toBe(401);
    });
  });

  it('antwoordt 202 met geldige Bearer', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/internal/night-refresh/start-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ httpStatus: 503, message: 'down' }),
      });
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ sent: false });
    });
  });

  it('is fail-closed buiten production', async () => {
    process.env.APP_ENV = 'preview';
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/internal/night-refresh/start-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ httpStatus: 503 }),
      });
      expect(res.status).toBe(503);
    });
  });
});
