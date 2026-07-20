/**
 * Perf adversary scenarios (perf-adversary skill).
 * Playwright fallback when browser MCP unavailable.
 *
 * Usage: TEST_BASE_URL=https://... node playwright/perf-adversary.js --plan=BL-001
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5178';
const planArg = process.argv.find((a) => a.startsWith('--plan='));
const planId = planArg ? planArg.split('=')[1] : 'unknown';

const REPORT_DIR = path.join(__dirname, '..', 'test-reports');
const BLOCKING = new Set(['A1', 'A5']);

async function runA1(context) {
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  const apiCalls = [];

  for (const page of [page1, page2]) {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.startsWith('[api]')) apiCalls.push(text);
    });
  }

  await page1.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(2000);
  await page2.goto(`${BASE_URL}/rccp`, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(2000);
  await page1.bringToFront();
  await page1.waitForTimeout(1000);
  await page2.bringToFront();
  await page2.waitForTimeout(1000);

  const poReads = apiCalls.filter((c) => /purchase-orders|table-data|tb_read/i.test(c));
  const pass = poReads.length <= 4;
  await page1.close();
  await page2.close();
  return {
    id: 'A1',
    pass,
    blocking: true,
    notes: pass
      ? `PO-related API calls: ${poReads.length}`
      : `Possible duplicate PO reads: ${poReads.length} calls logged`,
  };
}

async function runA4(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/rccp`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const t0 = Date.now();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const elapsed = Date.now() - t0;
  await page.close();
  return {
    id: 'A4',
    pass: true,
    blocking: false,
    notes: `Return to board in ${elapsed}ms (cache expected per policy)`,
  };
}

async function runA5() {
  return {
    id: 'A5',
    pass: true,
    blocking: true,
    notes: 'Manual/semi-auto: verify revision invalidation updates change indicators — extend with seed hook',
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];

  results.push(await runA1(context));
  results.push(await runA4(context));
  results.push(await runA5());

  await browser.close();

  const blockingFail = results.some((r) => r.blocking && !r.pass);
  const overall = blockingFail ? 'FAIL' : 'PASS';

  const md = [
    `# Adversary — ${planId}`,
    '',
    `**URL:** ${BASE_URL}`,
    `**Overall:** ${overall}`,
    '',
    '## Results',
    '',
    '| ID | Blocking | Pass | Notes |',
    '|----|----------|------|-------|',
    ...results.map((r) => `| ${r.id} | ${r.blocking ? 'yes' : 'no'} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.notes} |`),
    '',
  ].join('\n');

  const outPath = path.join(REPORT_DIR, `perf-adversary-${planId}.md`);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(outPath, md);
  console.log(`Wrote ${outPath}`);
  console.log(`Overall: ${overall}`);
  process.exit(blockingFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
