'use strict';

// Playwright Test-config voor de e2e/-suite (los van playwright/, dat bevat alleen ad-hoc
// perf-scripts die los draaien via `node`, geen testrunner). Zelfde TEST_BASE_URL-conventie als
// die perf-scripts al gebruiken, zodat dezelfde env var werkt voor beide.
//
// dotenv laden zoals de rest van de app (server/server.js) — Playwright Test laadt .env niet
// automatisch, zonder dit zouden E2E_TEST_EMAIL/PASSWORD altijd leeg zijn buiten CI.
require('dotenv').config();

const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:5178').replace(/\/$/, '');
const isCI = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Default (30s) is te krap tegen een DEV Container App na een koude start (TTFB kan tientallen
  // seconden zijn bij de eerste hit na een deploy) — zelfde soort marge als de Vitest-testTimeout-fix.
  timeout: 60000,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
