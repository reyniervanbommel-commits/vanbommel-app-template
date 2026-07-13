'use strict';

const express = require('express');

const settingsService = {
  ODATA_KEYS: ['D365_PRODUCT_IMAGE_SERVICE_URL'],
  ODATA_SECRET_KEYS: [],
  saveODataConfig: vi.fn(),
};

vi.mock('../services/SettingsService', () => settingsService);

const adminRouter = require('./admin');

async function updateODataSettingsAs(role) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 1, email: 'employee@example.com', role };
    next();
  });
  app.use('/api/admin', adminRouter);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  try {
    return await fetch(`http://127.0.0.1:${server.address().port}/api/admin/settings/odata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        D365_PRODUCT_IMAGE_SERVICE_URL: 'https://untrusted.example/product-image',
      }),
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('POST /api/admin/settings/odata', () => {
  beforeEach(() => {
    settingsService.saveODataConfig.mockReset();
  });

  it('blokkeert medewerkers voordat zij D365- of productimage-instellingen wijzigen', async () => {
    const response = await updateODataSettingsAs('employee');

    expect(response.status).toBe(403);
    expect(settingsService.saveODataConfig).not.toHaveBeenCalled();
  });
});
