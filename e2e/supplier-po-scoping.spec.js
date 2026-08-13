'use strict';

// E2E-scenario 2 uit het voorstel: supplier data-scoping op de echte stack (browser -> route ->
// middleware -> DB), als aanvulling op de al-geteste middleware in isolatie
// (server/middleware/dataAccess.test.js, server/routes/data.test.js).
//
// Testaccount: e2e-test-supplier@vanbommel.internal, vendor_account='V000583' — een bestaand
// vendoraccount met echte PO-data op DEV (zie scripts/db/migrations/038_seed_e2e_supplier_test_user.sql).
// Zonder een account met echte data zou deze test alleen de lege-staat bewijzen, niet de
// daadwerkelijke afscherming tussen suppliers.
const { test, expect } = require('@playwright/test');

const SUPPLIER_EMAIL = process.env.E2E_SUPPLIER_EMAIL;
const SUPPLIER_PASSWORD = process.env.E2E_SUPPLIER_PASSWORD;

test.describe('Supplier data-scoping', () => {
  test.skip(
    !SUPPLIER_EMAIL || !SUPPLIER_PASSWORD,
    'E2E_SUPPLIER_EMAIL / E2E_SUPPLIER_PASSWORD niet gezet — zie .env.example'
  );

  async function loginAsSupplier(page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(SUPPLIER_EMAIL);
    await page.getByLabel('Password').fill(SUPPLIER_PASSWORD);
  }

  test('ziet in de board-data uitsluitend orders van het eigen vendorAccount', async ({ page }) => {
    await loginAsSupplier(page);

    const boardResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/data/purchase-orders') && res.request().method() === 'GET'
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    const boardResponse = await boardResponsePromise;

    expect(boardResponse.ok()).toBe(true);
    const data = await boardResponse.json();
    const rows = data.rows || [];

    // Bewust: rows.length > 0 bevestigt dat dit geen lege-staat-toeval is — het testaccount heeft
    // écht data, dus "alleen eigen vendorAccount" bewijst daadwerkelijke afscherming.
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.values?.vendorAccount).toBe('V000583');
    }
  });

  test('kan de admin-pagina niet bereiken (rolgate, client + server)', async ({ page }) => {
    await loginAsSupplier(page);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();

    await page.goto('/admin');

    await expect(page).not.toHaveURL(/\/admin/);
  });
});
