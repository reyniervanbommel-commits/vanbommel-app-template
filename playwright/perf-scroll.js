/**
 * Perf scroll scout (J4+) — wheel jank on PO board.
 *
 * Usage:
 *   PERF_PROFILE=L TEST_BASE_URL=... node playwright/perf-scroll.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:5178').replace(/\/$/, '');
const PROFILE = process.env.PERF_PROFILE || 'M';
const RUNS = Number(process.env.PERF_RUNS || 3);
const SCROLL_STEPS = Number(process.env.PERF_SCROLL_STEPS || 15);
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

function parseLongframe(text) {
  if (!text.startsWith('[perf] longframe ')) return null;
  try {
    return JSON.parse(text.slice('[perf] longframe '.length));
  } catch {
    return null;
  }
}

function parseInteraction(text) {
  if (!text.startsWith('[perf] interaction ')) return null;
  try {
    return JSON.parse(text.slice('[perf] interaction '.length));
  } catch {
    return null;
  }
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
    return { ok: false, note: 'Login form missing' };
  }

  await emailField.fill(process.env.TEST_LOGIN_EMAIL || process.env.LOGIN_EMAIL || 'admin@example.com');
  await passwordField.fill(process.env.TEST_LOGIN_PASSWORD || process.env.LOGIN_PASSWORD || 'Bootstrap123!');
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
    page.getByText('Inkooporder').first().waitFor({ timeout: 45000 }),
    page.getByText(/No purchase orders found/i).waitFor({ timeout: 45000 }),
    page.locator('[aria-label^="Select order"]').first().waitFor({ timeout: 45000 }),
  ]).catch(() => page.waitForTimeout(2000));
}

async function goToAllOrders(page) {
  // Klik de "All orders" tab op het PO-bord zodat de scrollbare tabel zichtbaar wordt.
  // Probeer meerdere label-varianten die in verschillende versies kunnen voorkomen.
  const allOrdersTab = page.getByRole('tab', { name: /All orders|Alle orders|All/i })
    .or(page.getByRole('button', { name: /All orders|Alle orders/i }))
    .first();
  const tabExists = await allOrdersTab.count().then((c) => c > 0).catch(() => false);
  if (tabExists) {
    await allOrdersTab.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  // Wacht tot er rijen of een leeg-bericht is
  await Promise.race([
    page.locator('[aria-label^="Select order"]').first().waitFor({ timeout: 15000 }),
    page.getByText(/No purchase orders found/i).waitFor({ timeout: 15000 }),
    page.locator('tbody tr').nth(2).waitFor({ timeout: 15000 }),
  ]).catch(() => page.waitForTimeout(1500));
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="fui-Toast"], [data-perf-overlay]').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none';
    });
    // Hide fixed bottom-left perf HUD that intercepts pointer events
    [...document.querySelectorAll('div')].forEach((el) => {
      const st = getComputedStyle(el);
      if (st.position === 'fixed' && (st.zIndex === '9998' || st.zIndex === '9999')) {
        el.style.display = 'none';
      }
    });
  }).catch(() => {});
}

async function findScrollContainer(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div, main, section')].filter((el) => {
      const st = getComputedStyle(el);
      const oy = st.overflowY;
      const canScroll = (oy === 'auto' || oy === 'scroll' || oy === 'overlay')
        && el.scrollHeight > el.clientHeight + 20;
      return canScroll;
    });
    candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    return candidates[0]
      ? { scrollHeight: candidates[0].scrollHeight, clientHeight: candidates[0].clientHeight }
      : null;
  });
}

async function runScrollSample(page) {
  const longframes = [];
  const interactions = [];
  const onConsole = (msg) => {
    const text = msg.text();
    const lf = parseLongframe(text);
    if (lf) longframes.push({ ...lf, at: Date.now() });
    const ix = parseInteraction(text);
    if (ix) interactions.push({ ...ix, at: Date.now() });
  };
  page.on('console', onConsole);

  await dismissOverlays(page);
  await page.evaluate(() => window.__perf?.reset?.());
  await page.waitForTimeout(500);

  let container = await findScrollContainer(page);
  // Fallback: programmatic scroll on largest overflow container even if not yet overflowed
  if (!container) {
    container = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('div')].filter((el) => {
        const st = getComputedStyle(el);
        return st.overflowY === 'auto' || st.overflowY === 'scroll';
      });
      candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
      const el = candidates[0];
      if (!el) return null;
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    });
  }
  if (!container) {
    page.off('console', onConsole);
    return { error: 'No scrollable PO container' };
  }

  const box = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div, main, section')].filter((el) => {
      const st = getComputedStyle(el);
      const oy = st.overflowY;
      return (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 20;
    });
    candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    let el = candidates[0];
    if (!el) {
      const fallback = [...document.querySelectorAll('div')].filter((e) => {
        const st = getComputedStyle(e);
        return st.overflowY === 'auto' || st.overflowY === 'scroll';
      }).sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      el = fallback;
    }
    if (!el) return null;
    el.scrollTop = 0;
    // Mark for programmatic scroll fallback
    el.setAttribute('data-perf-scroll-target', 'true');
    return el.getBoundingClientRect();
  });

  if (!box) {
    page.off('console', onConsole);
    return { error: 'Scroll container box missing' };
  }

  const startAt = Date.now();
  const cx = Math.max(box.x + 80, 200);
  const cy = Math.max(box.y + 80, 200);
  await page.mouse.move(cx, cy);

  for (let i = 0; i < SCROLL_STEPS; i += 1) {
    await page.mouse.wheel(0, 280);
    await page.evaluate(() => {
      const el = document.querySelector('[data-perf-scroll-target="true"]');
      if (el) el.scrollTop += 280;
    }).catch(() => {});
    await page.waitForTimeout(80);
  }

  const scrollEndAt = Date.now();
  await page.waitForTimeout(400);
  page.off('console', onConsole);

  const windowStart = startAt;
  const windowEnd = scrollEndAt + 400;
  const inWindow = (e) => e.at >= windowStart && e.at <= windowEnd;

  const lfWin = longframes.filter(inWindow);
  const ixWin = interactions.filter(inWindow);

  const maxLongFrameMs = lfWin.reduce((m, e) => Math.max(m, e.duration || 0), 0);
  const scrollJankMs = lfWin.reduce((s, e) => s + (e.blocking || 0), 0);
  const slowInteractionCount = ixWin.filter((e) => (e.total || 0) >= 100).length;
  const scrollStableMs = windowEnd - scrollEndAt;

  return {
    maxLongFrameMs,
    scrollJankMs,
    scrollStableMs,
    slowInteractionCount,
    longframeCount: lfWin.length,
    container,
  };
}

function loadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function mergeBacklog(scrollResult) {
  if (!fs.existsSync(BACKLOG_PATH)) return;
  let backlog;
  try {
    backlog = JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8'));
  } catch {
    return;
  }

  const policy = loadPolicy();
  const reduction = (policy.scrollTargets?.reductionPercent ?? 30) / 100;
  const weight = policy.frequencyFallback?.poBoard ?? 3;
  const maxLf = scrollResult.maxLongFrameMs;
  const target = Number.isFinite(maxLf) ? Math.round(maxLf * (1 - reduction)) : null;
  const score = Number.isFinite(maxLf) && Number.isFinite(target)
    ? Math.max(0, maxLf - target) * weight
    : 0;

  const item = {
    id: 'BL-004',
    journey: 'J4',
    action: 'PO board vertical scroll (wheel)',
    profile: PROFILE,
    maxLongFrameMs: maxLf,
    scrollJankMs: scrollResult.scrollJankMs,
    scrollStableMs: scrollResult.scrollStableMs,
    slowInteractionCount: scrollResult.slowInteractionCount,
    dominantPost: 'render',
    targetLongFrameMs: target,
    routeFrequencyWeight: weight,
    priorityScore: Math.round(score),
    status: 'open',
  };

  const idx = (backlog.items || []).findIndex((i) => i.journey === 'J4');
  if (idx >= 0) backlog.items[idx] = { ...backlog.items[idx], ...item };
  else backlog.items = [...(backlog.items || []), item];

  backlog.items.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  backlog.scrollMeasuredAt = new Date().toISOString();
  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2), 'utf8');
}

function mergeBaseline(scrollResult) {
  let baseline = {};
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
      baseline = {};
    }
  }
  baseline.scrollJourneys = baseline.scrollJourneys || {};
  baseline.scrollJourneys.J4 = {
    label: 'PO board vertical scroll',
    profile: PROFILE,
    median: scrollResult,
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
  hud.hudWatch = [
    ...(hud.hudWatch || []).filter((w) => w.id !== 'po-scroll-jank'),
    {
      id: 'po-scroll-jank',
      label: 'PO board scroll — max long frame',
      journey: 'J4',
      baselineMs: scrollResult.maxLongFrameMs,
      metric: 'maxLongFrameMs',
    },
  ];
  hud.scrollJourneys = baseline.scrollJourneys;
  fs.writeFileSync(publicPath, JSON.stringify(hud, null, 2), 'utf8');
}

function buildReport(results, loginOk) {
  const med = results.median;
  return `# Perf scroll — ${new Date().toISOString().slice(0, 10)}

- **URL:** ${BASE_URL}
- **Profile:** ${PROFILE}
- **Runs:** ${RUNS}
- **Login:** ${loginOk ? 'OK' : 'FAILED'}

## J4 — PO vertical scroll (median)

| Metric | Value |
|--------|------:|
| maxLongFrameMs | ${med.maxLongFrameMs ?? '—'} |
| scrollJankMs | ${med.scrollJankMs ?? '—'} |
| scrollStableMs | ${med.scrollStableMs ?? '—'} |
| slowInteractionCount | ${med.slowInteractionCount ?? '—'} |
| longframeCount | ${med.longframeCount ?? '—'} |

Merged into \`perf-backlog.json\` (BL-004) and \`perf-baseline.json\`.
`;
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  const loginInfo = await login(page);
  if (!loginInfo.ok) {
    await browser.close();
    console.error('Login failed');
    process.exit(2);
  }

  const samples = [];
  for (let r = 0; r < RUNS; r += 1) {
    process.stdout.write(`Scroll run ${r + 1}/${RUNS}…\n`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForBoard(page);
    await goToAllOrders(page);
    const sample = await runScrollSample(page);
    if (sample.error) {
      console.warn(sample.error);
    } else {
      samples.push(sample);
    }
  }

  await browser.close();

  if (!samples.length) {
    console.error('No scroll samples');
    process.exit(1);
  }

  const medianResult = {
    maxLongFrameMs: median(samples.map((s) => s.maxLongFrameMs)),
    scrollJankMs: median(samples.map((s) => s.scrollJankMs)),
    scrollStableMs: median(samples.map((s) => s.scrollStableMs)),
    slowInteractionCount: median(samples.map((s) => s.slowInteractionCount)),
    longframeCount: median(samples.map((s) => s.longframeCount)),
  };

  mergeBaseline(medianResult);
  mergeBacklog(medianResult);

  const reportPath = path.join(REPORT_DIR, `perf-scroll-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, buildReport({ median: medianResult }, true), 'utf8');

  console.log(`Report: ${reportPath}`);
  console.log(`J4 maxLongFrameMs (median): ${medianResult.maxLongFrameMs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
