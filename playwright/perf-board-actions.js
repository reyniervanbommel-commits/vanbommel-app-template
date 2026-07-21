/**
 * Perf board actions (J7 filter Apply, J8 text style Bold) — perf-board-actions skill.
 *
 * Usage:
 *   PERF_PROFILE=L TEST_BASE_URL=... node playwright/perf-board-actions.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:5178').replace(/\/$/, '');
const PROFILE = process.env.PERF_PROFILE || 'M';
const RUNS = Number(process.env.PERF_RUNS || 3);
const REPORT_DIR = path.join(__dirname, '..', 'test-reports');
const BASELINE_PATH = path.join(REPORT_DIR, 'perf-baseline.json');
const BACKLOG_PATH = path.join(REPORT_DIR, 'perf-backlog.json');
const POLICY_PATH = path.join(REPORT_DIR, 'perf-optimize-policy.json');

function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  const emailField = page.locator('#login-email').or(page.locator('input[type="email"]')).first();
  const passwordField = page.locator('#login-password').or(page.locator('input[type="password"]')).first();
  const hasForm = await emailField.waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(async () => (await passwordField.count()) > 0);

  if (!hasForm) {
    if (!page.url().includes('/login')) return { ok: true };
    return { ok: false };
  }

  await emailField.fill(process.env.TEST_LOGIN_EMAIL || 'admin@example.com');
  await passwordField.fill(process.env.TEST_LOGIN_PASSWORD || 'Bootstrap123!');
  await page.getByRole('button', { name: /^(Sign in|Log in)$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 });

  const poNav = page.getByRole('button', { name: /Master plan purchase orders|Purchase orders/i });
  if ((await poNav.count()) > 0) await poNav.first().click({ timeout: 30000 }).catch(() => {});
  await waitForBoard(page);
  await page.waitForTimeout(1200);
  return { ok: true };
}

async function waitForBoard(page) {
  await Promise.race([
    page.getByText(/Last refreshed/i).waitFor({ timeout: 45000 }),
    page.getByText(/No purchase orders found/i).waitFor({ timeout: 45000 }),
    page.locator('[aria-label^="Select order"]').first().waitFor({ timeout: 45000 }),
  ]).catch(() => page.waitForTimeout(2000));
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('div')].forEach((el) => {
      const st = getComputedStyle(el);
      if (st.position === 'fixed' && (Number(st.zIndex) >= 9990)) {
        el.style.pointerEvents = 'none';
        el.style.display = 'none';
      }
    });
  }).catch(() => {});
}

async function openFirstColumnMenu(page) {
  await dismissOverlays(page);
  const trigger = page.locator('[data-column-menu-trigger="true"]').first();
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  await trigger.click({ force: true, timeout: 15000 });
  await page.getByRole('button', { name: 'Apply' }).waitFor({ state: 'visible', timeout: 15000 });
}

async function waitStableMs(page, startMs) {
  // Cap UX-wait: first paint/stable window, not full network round-trip.
  const deadline = Date.now() + 2000;
  let last = Date.now() - startMs;
  while (Date.now() < deadline) {
    const stable = await page.evaluate(() => {
      const now = Date.now();
      return !window.__lastLongframeAt || (now - window.__lastLongframeAt) > 120;
    });
    last = Date.now() - startMs;
    if (stable && last >= 16) return Math.min(last, 2000);
    await page.waitForTimeout(40);
  }
  return Math.min(Date.now() - startMs, 2000);
}

async function measureFilterApply(page) {
  await page.evaluate(() => window.__perf?.reset?.());
  await openFirstColumnMenu(page);

  const valueInput = page.locator('input[aria-label*="Filter value for"]').first();
  if ((await valueInput.count()) === 0) {
    return { error: 'No filter value input' };
  }

  await valueInput.fill('__perf_test_filter__');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Apply' }).click();
  const filterApplyMs = await waitStableMs(page, t0);

  await page.keyboard.press('Escape').catch(() => {});
  return { filterApplyMs, maxLongFrameMs: null };
}

async function measureTextStyleBold(page) {
  await page.evaluate(() => window.__perf?.reset?.());
  await openFirstColumnMenu(page);

  const textStyleBtn = page.getByRole('button', { name: 'Text style' });
  if ((await textStyleBtn.count()) === 0) {
    return { error: 'Text style not available (need admin?)' };
  }
  await textStyleBtn.click();
  const boldBtn = page.getByRole('button', { name: 'Toggle bold' });
  await boldBtn.waitFor({ state: 'visible', timeout: 10000 });

  const t0 = Date.now();
  await boldBtn.click();
  const textStyleApplyMs = await waitStableMs(page, t0);

  await page.keyboard.press('Escape').catch(() => {});
  return { textStyleApplyMs };
}

function loadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function upsertBacklog(j7, j8) {
  if (!fs.existsSync(BACKLOG_PATH)) return;
  let backlog;
  try {
    backlog = JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8'));
  } catch {
    return;
  }

  const policy = loadPolicy();
  const reduction = (policy.boardActionTargets?.reductionPercent ?? 30) / 100;
  const weight = policy.frequencyFallback?.poBoard ?? 3;

  const items = [
    {
      id: 'BL-005',
      journey: 'J7',
      action: 'Column filter Apply',
      profile: PROFILE,
      filterApplyMs: j7.filterApplyMs,
      dominantPost: 'render',
      targetFilterMs: Number.isFinite(j7.filterApplyMs)
        ? Math.round(j7.filterApplyMs * (1 - reduction))
        : null,
      routeFrequencyWeight: weight,
      priorityScore: Number.isFinite(j7.filterApplyMs)
        ? Math.round(Math.max(0, j7.filterApplyMs - j7.filterApplyMs * (1 - reduction)) * weight)
        : 0,
      status: 'open',
    },
    {
      id: 'BL-006',
      journey: 'J8',
      action: 'Column text style Bold toggle',
      profile: PROFILE,
      textStyleApplyMs: j8.textStyleApplyMs,
      dominantPost: 'network',
      targetStyleMs: Number.isFinite(j8.textStyleApplyMs)
        ? Math.round(j8.textStyleApplyMs * (1 - reduction))
        : null,
      routeFrequencyWeight: weight,
      priorityScore: Number.isFinite(j8.textStyleApplyMs)
        ? Math.round(Math.max(0, j8.textStyleApplyMs - j8.textStyleApplyMs * (1 - reduction)) * weight)
        : 0,
      status: 'open',
    },
  ];

  for (const item of items) {
    const idx = (backlog.items || []).findIndex((i) => i.id === item.id);
    if (idx >= 0) backlog.items[idx] = { ...backlog.items[idx], ...item };
    else backlog.items = [...(backlog.items || []), item];
  }
  backlog.items.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  backlog.boardActionsMeasuredAt = new Date().toISOString();
  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2), 'utf8');
}

function mergeBaseline(j7, j8) {
  let baseline = {};
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
      baseline = {};
    }
  }
  baseline.boardActionJourneys = {
    J7: { label: 'Column filter Apply', profile: PROFILE, median: j7 },
    J8: { label: 'Text style Bold', profile: PROFILE, median: j8 },
    measuredAt: new Date().toISOString(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf8');

  const publicPath = path.join(__dirname, '..', 'public', 'perf-baseline.json');
  let hud = {};
  if (fs.existsSync(publicPath)) {
    try {
      hud = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
    } catch {
      hud = {};
    }
  }
  const watch = [
    ...(hud.hudWatch || []).filter((w) => !['po-filter-apply', 'po-text-style'].includes(w.id)),
    {
      id: 'po-filter-apply',
      label: 'PO filter Apply',
      journey: 'J7',
      baselineMs: j7.filterApplyMs,
      metric: 'filterApplyMs',
    },
    {
      id: 'po-text-style',
      label: 'PO text style Bold',
      journey: 'J8',
      baselineMs: j8.textStyleApplyMs,
      metric: 'textStyleApplyMs',
    },
  ];
  hud.hudWatch = watch;
  hud.boardActionJourneys = baseline.boardActionJourneys;
  fs.writeFileSync(publicPath, JSON.stringify(hud, null, 2), 'utf8');
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    window.__lastLongframeAt = 0;
    if (typeof PerformanceObserver !== 'function') return;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if ((e.blockingDuration || 0) >= 50) {
            window.__lastLongframeAt = Date.now();
          }
        }
      }).observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();

  const loginOk = await login(page);
  if (!loginOk.ok) {
    await browser.close();
    process.exit(2);
  }

  const j7Samples = [];
  const j8Samples = [];

  for (let r = 0; r < RUNS; r += 1) {
    process.stdout.write(`Board actions run ${r + 1}/${RUNS}…\n`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForBoard(page);

    const j7 = await measureFilterApply(page);
    if (!j7.error) j7Samples.push(j7);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForBoard(page);
    const j8 = await measureTextStyleBold(page);
    if (!j8.error) j8Samples.push(j8);
  }

  await browser.close();

  const j7Median = {
    filterApplyMs: median(j7Samples.map((s) => s.filterApplyMs)),
  };
  const j8Median = {
    textStyleApplyMs: median(j8Samples.map((s) => s.textStyleApplyMs)),
  };

  mergeBaseline(j7Median, j8Median);
  upsertBacklog(j7Median, j8Median);

  const reportPath = path.join(REPORT_DIR, `perf-board-actions-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, `# Perf board actions

- Profile: ${PROFILE}
- J7 filterApplyMs: ${j7Median.filterApplyMs ?? '—'}
- J8 textStyleApplyMs: ${j8Median.textStyleApplyMs ?? '—'}
`, 'utf8');

  console.log(`Report: ${reportPath}`);
  console.log(`J7 filterApplyMs: ${j7Median.filterApplyMs}`);
  console.log(`J8 textStyleApplyMs: ${j8Median.textStyleApplyMs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
