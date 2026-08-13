'use strict';

// Selectieve regressietest bovenop de al-geteste middleware (restrictSupplierDataAccess,
// zie server/middleware/dataAccess.test.js): dit bestand test alleen de routes die zelf nog
// supplier-scoping toepassen op basis van req.user, niet alle 32 routes in data.js.
const express = require('express');
const dataRouter = require('./data');
const dataService = require('../services/TableDataService');
const settingsService = require('../services/SettingsService');
const remarksService = require('../services/RowRemarksService');

const originalRead = dataService.read;
const originalGetAsync = settingsService.getAsync;
const originalSetReaction = remarksService.setReaction;

afterEach(() => {
  dataService.read = originalRead;
  settingsService.getAsync = originalGetAsync;
  remarksService.setReaction = originalSetReaction;
});

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/data', dataRouter);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
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

describe('GET /:tableKey — supplier-scoping', () => {
  it('geeft voor een supplier het eigen vendorAccount + de admin-gekozen filterkolom door aan dataService.read', async () => {
    dataService.read = vi.fn().mockResolvedValue({ rows: [], meta: {} });
    settingsService.getAsync = vi.fn().mockResolvedValue('customVendorColumn');

    await withServer({ id: 5, role: 'supplier', vendorAccount: 'V000583' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data/purchase-orders`);
      expect(res.status).toBe(200);
    });

    expect(dataService.read).toHaveBeenCalledWith(expect.objectContaining({
      tableKey: 'purchase-orders',
      supplierAccount: 'V000583',
      supplierFilterColumn: 'customVendorColumn',
    }));
  });

  it('geeft voor staff (employee/admin) geen supplierAccount door — ziet alle orders', async () => {
    dataService.read = vi.fn().mockResolvedValue({ rows: [], meta: {} });
    settingsService.getAsync = vi.fn();

    await withServer({ id: 1, role: 'employee' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data/purchase-orders`);
      expect(res.status).toBe(200);
    });

    expect(dataService.read).toHaveBeenCalledWith(expect.objectContaining({
      tableKey: 'purchase-orders',
      supplierAccount: null,
    }));
    // Staff heeft geen supplier-filterkolom nodig — geen extra settings-lookup.
    expect(settingsService.getAsync).not.toHaveBeenCalled();
  });
});

describe('PUT /:tableKey/remarks/:id/reaction — open voor supplier (read-only remarks, wel reacties)', () => {
  it('geeft de reactie door aan remarksService met de juiste actor', async () => {
    remarksService.setReaction = vi.fn().mockResolvedValue({ '👍': 1 });

    await withServer({ id: 9, role: 'supplier' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data/purchase-orders/remarks/42/reaction`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionKey: 'PO', recordKey: '1', emoji: '👍', active: true }),
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.reactions).toEqual({ '👍': 1 });
    });

    expect(remarksService.setReaction).toHaveBeenCalledWith(
      expect.objectContaining({ tableKey: 'purchase-orders', id: 42, emoji: '👍', active: true }),
      { id: 9, role: 'supplier', vendor_account: null },
    );
  });

  it('geeft 400 voor een ongeldige emoji, zonder remarksService aan te roepen', async () => {
    remarksService.setReaction = vi.fn();

    await withServer({ id: 9, role: 'supplier' }, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/data/purchase-orders/remarks/42/reaction`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionKey: 'PO', recordKey: '1', emoji: '💣', active: true }),
      });
      expect(res.status).toBe(400);
    });
    expect(remarksService.setReaction).not.toHaveBeenCalled();
  });
});
