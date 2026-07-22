require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5178';
const LOGIN_EMAIL = process.env.TEST_LOGIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.TEST_LOGIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const REPORT_PATH = path.join(
  __dirname, '..', 'test-reports',
  `test-report-feature-rccp-vendor-filter-${new Date().toISOString().slice(0, 10)}.md`,
);

function ensureDirs() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
}

async function run() {
  ensureDirs();
  const consoleErrors = [];
  const rccpRequests = [];
  const findings = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/rccp/')) {
      rccpRequests.push({ url, status: response.status() });
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  // No screenshots during login: the form would capture the real admin e-mail/password (privacy).
  const onLogin = await page.locator('input[type="password"]').count() > 0;
  findings.push(`onLogin detected: ${onLogin}`);
  if (onLogin) {
    if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
      throw new Error('Set TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD (or BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD in .env) to run this script.');
    }
    await page.fill('#login-email', LOGIN_EMAIL);
    await page.fill('#login-password', LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  }

  await page.goto(`${BASE_URL}/rccp`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-rccp-page-load.png'), fullPage: true });

  // 1) Check that the vendor filter is NOT "All vendors" by default (first vendor auto-selected)
  const comboboxInput = page.getByRole('combobox').first();
  let defaultVendorText = '';
  try {
    await comboboxInput.waitFor({ state: 'visible', timeout: 10000 });
    defaultVendorText = (await comboboxInput.inputValue().catch(() => '')) || (await comboboxInput.textContent()) || '';
  } catch (err) {
    findings.push(`Could not read vendor filter value: ${err.message}`);
  }

  if (defaultVendorText && defaultVendorText.trim().toLowerCase() !== 'all vendors') {
    findings.push(`PASS: Vendor filter defaults to "${defaultVendorText.trim()}" (not "All vendors").`);
  } else {
    findings.push(`FAIL or UNKNOWN: Vendor filter default value = "${defaultVendorText}".`);
  }

  // Only one /rccp/analysis call should have fired (for the default vendor), not one for "all vendors"
  const analysisCalls = rccpRequests.filter((r) => r.url.includes('/rccp/analysis'));
  findings.push(`Analysis calls fired on load: ${analysisCalls.length} -> ${analysisCalls.map((r) => r.url).join(' | ')}`);
  const allVendorsCall = analysisCalls.find((r) => !r.url.includes('vendorAccount='));
  if (allVendorsCall) {
    findings.push(`FAIL: Found an analysis call WITHOUT vendorAccount (loads all vendors): ${allVendorsCall.url}`);
  } else if (analysisCalls.length) {
    findings.push('PASS: All analysis calls include a vendorAccount filter (no "all vendors" load on open).');
  }

  // 2) Search in the vendor filter combobox by vendor NUMBER
  await comboboxInput.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-vendor-filter-open.png'), fullPage: true });

  await comboboxInput.press('Control+a');
  await comboboxInput.type('696', { delay: 60 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-vendor-filter-search-by-number.png'), fullPage: true });
  const optionsByNumber = await page.getByRole('option').allTextContents();
  findings.push(`Search "696" (vendor number) -> options: ${JSON.stringify(optionsByNumber)}`);

  // 3) Search by vendor NAME
  await comboboxInput.press('Control+a');
  await comboboxInput.type('vasconcelos', { delay: 60 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-vendor-filter-search-by-name.png'), fullPage: true });
  const optionsByName = await page.getByRole('option').allTextContents();
  findings.push(`Search "vasconcelos" (vendor name) -> options: ${JSON.stringify(optionsByName)}`);

  await browser.close();

  const report = `# RCCP Vendor Filter — Live Test Report

Date: ${new Date().toISOString()}
Base URL: ${BASE_URL}

## Findings
${findings.map((f) => `- ${f}`).join('\n')}

## Console errors
${consoleErrors.length ? consoleErrors.map((e) => `- ${e}`).join('\n') : '- None'}

## RCCP network calls
${rccpRequests.map((r) => `- [${r.status}] ${r.url}`).join('\n')}

## Screenshots
- playwright/screenshots/01-rccp-page-load.png
- playwright/screenshots/02-vendor-filter-open.png
- playwright/screenshots/03-vendor-filter-search.png
`;
  fs.writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(report);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
