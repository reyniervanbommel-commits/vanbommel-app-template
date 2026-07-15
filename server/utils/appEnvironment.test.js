'use strict';

import { afterEach, describe, expect, it } from 'vitest';

const ENV_KEYS = ['APP_ENV', 'NODE_ENV', 'APP_BASE_URL', 'COOKIE_SECURE'];

function loadModule() {
  return import('./appEnvironment.js');
}

describe('appEnvironment', () => {
  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      delete process.env[key];
    });
  });

  it('behandelt APP_ENV=dev als dev-like ondanks NODE_ENV=production', async () => {
    process.env.APP_ENV = 'dev';
    process.env.NODE_ENV = 'production';
    const { isDevLikeApp, isProductionApp } = await loadModule();
    expect(isDevLikeApp()).toBe(true);
    expect(isProductionApp()).toBe(false);
  });

  it('valt terug op dev wanneer NODE_ENV niet production is', async () => {
    process.env.NODE_ENV = 'development';
    const { getAppEnv, isDevLikeApp } = await loadModule();
    expect(getAppEnv()).toBe('dev');
    expect(isDevLikeApp()).toBe(true);
  });

  it('gebruikt localhost:5178 als default APP_BASE_URL', async () => {
    const { getAppBaseUrl, DEFAULT_LOCAL_APP_ORIGIN } = await loadModule();
    expect(getAppBaseUrl()).toBe(DEFAULT_LOCAL_APP_ORIGIN);
    expect(DEFAULT_LOCAL_APP_ORIGIN).toBe('http://localhost:5178');
  });

  it('zet secure cookies aan bij https APP_BASE_URL', async () => {
    process.env.APP_BASE_URL = 'https://vendorportal-dev.example.azurecontainerapps.io';
    const { useSecureSessionCookies } = await loadModule();
    expect(useSecureSessionCookies()).toBe(true);
  });
});
