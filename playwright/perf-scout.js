/**
 * Perf pipeline Scout (v1 journeys J1–J3) — perf-orchestrate stap 2.
 *
 * Usage:
 *   node playwright/perf-scout.js
 *
 * Env:
 *   TEST_BASE_URL          Azure DEV frontend URL
 *   TEST_LOGIN_EMAIL       Login e-mail
 *   TEST_LOGIN_PASSWORD    Login wachtwoord
 *   PERF_RUNS              Metingen per actie (default 3)
 *   PERF_PROFILE           M | L (label in artifacts; seed apart)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:5178').replace(/\/$/, '');
const RUNS = Number(process.env.PERF_RUNS || 3);
const PROFILE = process.env.PERF_PROFILE || 'M';
const REPORT_DIR = path.join(__dirname, '..', 'test-reports');
const REPORT_PATH = path.join(REPORT_DIR, `perf-review-${new Date().toISOString().slice(0, 10)}.md`);
const BASELINE_PATH = path.join(REPORT_DIR, 'perf-baseline.json');
const BACKLOG_PATH = path.join(REPORT_DIR, 'perf-backlog.json');
const POLICY_PATH = path.join(REPORT_DIR, 'perf-optimize-policy.json');

const SQL_LABELS = new Set([
  'tb_read_sql', 'tb_read_masters', 'tb_read_details', 'tb_read_custom',
  'tb_read_cols', 'tb_links', 'tb_lookups', 'tb_ledger', 'tb_revision',
  'tb_history_hints', 'tb_meta', 'tb_sync_state', 'tb_viewed', 'tb_track_marks', 'tb_retention',
  'bi_meta', 'bi_aggregate', 'rccp_po_read', 'rccp_capacity', 'rccp_vendor_list',
  'remarks_list_sql', 'remarks_activity',
]);

const FALLBACK_FREQUENCY = {
  '/': 3.0,
  '/rccp': 1.5,
  'return-board': 2.0,
};

const TARGET_REDUCTION = {
  J1: 0.30,
  J2: 0.25,
  J3: 0.30,
};

function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

function parseConsoleLine(text) {
  if (text.startsWith('[perf] interaction ')) {
    try {
      return { kind: 'interaction', data: JSON.parse(text.slice('[perf] interaction '.length)) };
    } catch {
      return null;
    }
  }
  if (text.startsWith('[perf] navigation ')) {
    try {
      return { kind: 'navigation', data: JSON.parse(text.slice('[perf] navigation '.length)) };
    } catch {
      return null;
    }
  }
  const apiMatch = text.match(/^\[api\]\s+(\w+)\s+(\S+)\s+→\s+(\d+)\s+in\s+(\d+)ms$/);
  if (apiMatch) {
    return {
      kind: 'api',
      method: apiMatch[1],
      path: apiMatch[2],
      status: Number(apiMatch[3]),
      ms: Number(apiMatch[4]),
    };
  }
  return null;
}

function attributeAction({ interaction, timings, serverTimingEntries }) {
  const total = interaction?.total ?? null;

  let sql = 0;
  let app = 0;
  const labels = [];
  for (const entry of serverTimingEntries) {
    for (const [name, ms] of Object.entries(entry.server || {})) {
      if (name === 'app') app += ms;
      if (SQL_LABELS.has(name) || name.startsWith('tb_lookup_')) {
        sql += ms;
        labels.push(name);
      }
    }
  }

  const apiCalls = timings.filter((t) => t.method !== 'ui');
  const clientCalls = timings.filter((t) => t.method === 'ui');
  const apiSum = apiCalls.reduce((sum, t) => sum + (t.ms || 0), 0);
  const clientSum = clientCalls.reduce((sum, t) => sum + (t.ms || 0), 0);
  const backendOther = Math.max(0, app - sql);
  const network = Math.max(0, apiSum - app);
  const render = total != null ? Math.max(0, total - apiSum - clientSum) : null;

  const posts = { sql, server: backendOther, network, client: clientSum, render };
  const dominantKey = Object.entries(posts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  const dominantMap = { sql: 'sql', server: 'server', network: 'network', client: 'client', render: 'render' };

  return {
    elapsedWall: total,
    app,
    apiSum,
    sql,
    backendOther,
    network,
    client: clientSum,
    render,
    dominantPost: dominantMap[dominantKey] || 'unknown',
    labels: [...new Set(labels)],
    // Full PO board reads only (GET /api/data/purchase-orders or /api/purchase-orders).
    // Do not count revision, remarks, columns, board-settings, bi/meta, board-views, etc.
    poApiCalls: apiCalls.filter((c) => {
      const p = String(c.path || '').split('?')[0].replace(/\/$/, '');
      return (
        p.endsWith('/data/purchase-orders')
        || p.endsWith('/api/purchase-orders')
        || p === '/purchase-orders'
      );
    }),
  };
}

async function resetPerf(page) {
  await page.evaluate(() => window.__perf?.reset?.()).catch(() => {});
}

async function collectSnapshot(page, sinceMs) {
  const timings = await page.evaluate(
    (since) => (window.__perf?.timings?.() || []).filter((t) => !since || t.at >= since),
    sinceMs,
  );
  const serverTimingEntries = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/'))
      .filter((r) => r.serverTiming?.length)
      .map((r) => ({
        url: r.name,
        duration: Math.round(r.duration),
        server: Object.fromEntries(r.serverTiming.map((s) => [s.name, Math.round(s.duration)])),
      })),
  );
  return { timings, serverTimingEntries };
}

async function measureInteraction(page, interactFn, waitFn) {
  const consoleEvents = [];
  const handler = (msg) => {
    const parsed = parseConsoleLine(msg.text());
    if (parsed) consoleEvents.push(parsed);
  };
  page.on('console', handler);

  const sinceMs = Date.now();
  await resetPerf(page);
  await page.evaluate(() => performance.clearResourceTimings?.()).catch(() => {});
  await interactFn(page);
  await waitFn(page);
  await page.waitForTimeout(1000);

  const snapshot = await collectSnapshot(page, sinceMs);
  page.off('console', handler);

  const interaction = consoleEvents.filter((e) => e.kind === 'interaction').slice(-1)[0]?.data;
  const navigation = consoleEvents.filter((e) => e.kind === 'navigation').slice(-1)[0]?.data;

  const attr = attributeAction({
    interaction,
    timings: snapshot.timings,
    serverTimingEntries: snapshot.serverTimingEntries.filter((e) => e.duration > 0),
  });

  if (attr.elapsedWall == null && navigation) {
    attr.elapsedWall = navigation.load ?? navigation.domContentLoaded ?? null;
    attr.fromNavigation = true;
  }

  return attr;
}

async function runSamples(page, interactFn, waitFn, runs = RUNS) {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    samples.push(await measureInteraction(page, interactFn, waitFn));
    await page.waitForTimeout(400);
  }

  const keys = ['elapsedWall', 'app', 'apiSum', 'sql', 'network', 'client', 'render'];
  const warm = {};
  for (const key of keys) {
    warm[key] = median(samples.map((s) => s[key]));
  }

  const dominantCounts = {};
  for (const s of samples) {
    dominantCounts[s.dominantPost] = (dominantCounts[s.dominantPost] || 0) + 1;
  }
  const dominantPost = Object.entries(dominantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  const allLabels = [...new Set(samples.flatMap((s) => s.labels || []))];
  const poFetchCounts = samples.map((s) => s.poApiCalls?.length || 0);

  return {
    runs: samples.length,
    cold: samples[0],
    warm,
    dominantPost,
    labels: allLabels,
    poFetchMedian: median(poFetchCounts),
    poFetchMax: Math.max(...poFetchCounts, 0),
  };
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 90000 });

  const emailField = page.locator('#login-email').or(page.locator('input[type="email"]')).first();
  const passwordField = page.locator('#login-password').or(page.locator('input[type="password"]')).first();
  const hasLoginForm = await emailField.waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(async () => (await passwordField.count()) > 0);

  if (!hasLoginForm) {
    const onApp = !page.url().includes('/login');
    if (onApp) return { ok: true, note: 'Already authenticated' };
    return { ok: false, note: 'Login form not found on /login' };
  }

  await emailField.fill(process.env.TEST_LOGIN_EMAIL || 'admin@example.com');
  await passwordField.fill(process.env.TEST_LOGIN_PASSWORD || 'Bootstrap123!');

  const signInButton = page.getByRole('button', { name: /^(Sign in|Log in)$/i });

  const loginResponse = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') || r.url().includes('/api/login'), { timeout: 20000 }).catch(() => null),
    signInButton.click(),
  ]).then(([resp]) => resp);

  if (loginResponse && loginResponse.status() >= 400) {
    return { ok: false, note: `Login failed (${loginResponse.status()})` };
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 });
  const poNav = page.getByRole('button', { name: /Master plan purchase orders|Purchase orders/i });
  if ((await poNav.count()) > 0) {
    await poNav.first().click({ timeout: 30000 }).catch(() => {});
  }
  await waitForBoard(page).catch(() => {});
  await page.waitForTimeout(1500);
  return { ok: true, note: `Logged in as ${process.env.TEST_LOGIN_EMAIL || 'admin@example.com'}` };
}

async function waitForBoard(page) {
  await Promise.race([
    page.getByText(/Last refreshed/i).waitFor({ timeout: 45000 }),
    page.getByText('Inkooporder').first().waitFor({ timeout: 45000 }),
    page.getByText(/No purchase orders found/i).waitFor({ timeout: 45000 }),
    page.locator('[aria-label^="Select order"]').first().waitFor({ timeout: 45000 }),
  ]).catch(() => page.waitForTimeout(3000));
}

async function waitForRccp(page) {
  await page.getByText('Loading RCCP dashboard...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.locator('[aria-label*="Show"][aria-label*="in chart"]').first()
    .waitFor({ timeout: 30000 })
    .catch(() => {});
}

async function fetchPageUsage(page) {
  try {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/admin/analytics/page-usage', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    });
    if (!data?.stats?.length) return null;

    const maxCount = Math.max(...data.stats.map((s) => s.count));
    const weights = {};
    for (const row of data.stats) {
      const pageName = row.page_name || '';
      const weight = maxCount > 0 ? row.count / maxCount : 1;
      if (pageName.includes('purchase') || pageName === '/' || pageName.includes('Master plan')) {
        weights['/'] = Math.max(weights['/'] || 0, weight * 3);
      }
      if (pageName.includes('rccp') || pageName.includes('RCCP')) {
        weights['/rccp'] = Math.max(weights['/rccp'] || 0, weight * 2);
      }
    }
    return Object.keys(weights).length ? weights : null;
  } catch {
    return null;
  }
}

function targetWallMs(journey, elapsedWall) {
  if (!Number.isFinite(elapsedWall)) return null;
  const reduction = TARGET_REDUCTION[journey] || 0.25;
  return Math.round(elapsedWall * (1 - reduction));
}

function priorityScore(elapsedWall, targetWall, weight) {
  if (!Number.isFinite(elapsedWall) || !Number.isFinite(targetWall)) return 0;
  return Math.max(0, elapsedWall - targetWall) * (weight || 1);
}

function buildBacklog({ j1, j2, j3, frequency, profile }) {
  const weightPo = frequency?.['/'] ?? FALLBACK_FREQUENCY['/'];
  const weightRccp = frequency?.['/rccp'] ?? FALLBACK_FREQUENCY['/rccp'];
  const weightReturn = frequency?.['return-board'] ?? FALLBACK_FREQUENCY['return-board'];

  const j1Wall = j1.warm.elapsedWall;
  const j2Wall = j2.warm.elapsedWall;
  const j3Wall = j3.warm.elapsedWall;

  const j1Target = targetWallMs('J1', j1Wall);
  const j2Target = targetWallMs('J2', j2Wall);
  const j3Target = targetWallMs('J3', j3Wall);

  const items = [
    {
      id: 'BL-001',
      journey: 'J1',
      action: 'PO board-load / (hard reload)',
      profile,
      elapsedWall: j1Wall,
      app: j1.warm.app,
      apiSum: j1.warm.apiSum,
      dominantPost: j1.dominantPost,
      labels: j1.labels,
      targetWallMs: j1Target,
      routeFrequencyWeight: weightPo,
      priorityScore: priorityScore(j1Wall, j1Target, weightPo),
      status: 'open',
    },
    {
      id: 'BL-002',
      journey: 'J2',
      action: 'Route /rccp dashboard load',
      profile,
      elapsedWall: j2Wall,
      app: j2.warm.app,
      apiSum: j2.warm.apiSum,
      dominantPost: j2.dominantPost,
      labels: j2.labels,
      targetWallMs: j2Target,
      routeFrequencyWeight: weightRccp,
      priorityScore: priorityScore(j2Wall, j2Target, weightRccp),
      status: 'open',
    },
    {
      id: 'BL-003',
      journey: 'J3',
      action: 'Return / after /rccp (duplicate PO-fetch)',
      profile,
      elapsedWall: j3Wall,
      app: j3.warm.app,
      apiSum: j3.warm.apiSum,
      duplicatePoFetchCount: j3.poFetchMedian,
      dominantPost: j3.dominantPost,
      labels: j3.labels,
      targetWallMs: j3Target,
      routeFrequencyWeight: weightReturn,
      priorityScore: priorityScore(j3Wall, j3Target, weightReturn)
        + (j3.poFetchMedian > 1 ? (j3.poFetchMedian - 1) * 500 * weightReturn : 0),
      status: 'open',
      note: j3.poFetchMedian > 1 ? `Duplicate PO fetch detected (median ${j3.poFetchMedian})` : null,
    },
  ];

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    environment: { url: BASE_URL, profiles: [profile] },
    frequencySource: frequency ? '/admin/analytics/page-usage' : 'fallback',
    items: items.sort((a, b) => b.priorityScore - a.priorityScore),
  };
}

function buildReport({ j1, j2, j3, loginInfo, perfReady, frequency, backlog }) {
  const envLabel = BASE_URL.includes('azurecontainerapps') ? 'Azure DEV Container App' : BASE_URL;
  const rows = backlog.items.map((item) =>
    `| ${item.id} | ${item.journey} | ${item.action} | ${item.elapsedWall ?? '—'} | ${item.targetWallMs ?? '—'} | ${item.dominantPost} | ${Math.round(item.priorityScore)} |`,
  ).join('\n');

  return `# Performance Review — ${new Date().toISOString().slice(0, 10)}

**Modus:** screening (Scout — pipeline v1)
**Omgeving:** ${envLabel}
**Profiel:** ${PROFILE} (label; seed op Azure DEV DB indien beschikbaar)
**Baseline:** bijgewerkt in \`perf-baseline.json\`
**Verdict:** BACKLOG GEVULD (${backlog.items.length} items)
**Meetweg:** Playwright headless (\`playwright/perf-scout.js\`)

- \`window.__perf\`: ${perfReady ? '**actief**' : '**niet gedetecteerd** — toerekening beperkt'}
- Login: ${loginInfo.note}
- Frequency: ${backlog.frequencySource}

---

## 1. v1 Journeys (mediaan ${RUNS}×)

| Journey | Actie | elapsedWall | app | apiSum | Dominant | PO-fetches |
|---------|-------|------------:|----:|-------:|----------|------------|
| J1 | Board-load / | ${j1.warm.elapsedWall ?? '—'} | ${j1.warm.app ?? '—'} | ${j1.warm.apiSum ?? '—'} | ${j1.dominantPost} | ${j1.poFetchMedian ?? '—'} |
| J2 | /rccp | ${j2.warm.elapsedWall ?? '—'} | ${j2.warm.app ?? '—'} | ${j2.warm.apiSum ?? '—'} | ${j2.dominantPost} | ${j2.poFetchMedian ?? '—'} |
| J3 | Terugkeer / | ${j3.warm.elapsedWall ?? '—'} | ${j3.warm.app ?? '—'} | ${j3.warm.apiSum ?? '—'} | ${j3.dominantPost} | **${j3.poFetchMedian ?? '—'}** |

---

## 2. Backlog (priorityScore)

| ID | Journey | Actie | elapsedWall | targetWall | Dominant | priorityScore |
|----|---------|-------|------------:|-----------:|----------|--------------:|
${rows}

---

## 3. Artifacts

- \`test-reports/perf-backlog.json\`
- \`test-reports/perf-baseline.json\` (profiel ${PROFILE})
- \`test-reports/perf-pipeline-state.json\` (scout completed)

Scout-only — geen fixes in deze run.
`;
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const perfReady = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    .then(() => page.evaluate(() => Boolean(window.__perf)))
    .catch(() => false);

  const loginInfo = await login(page);
  if (!loginInfo.ok) {
    await browser.close();
    console.error(loginInfo.note);
    process.exit(2);
  }

  const frequency = await fetchPageUsage(page);

  process.stdout.write('Measuring J1 (board-load)…\n');
  const j1 = await runSamples(
    page,
    async (p) => { await p.reload({ waitUntil: 'domcontentloaded' }); },
    waitForBoard,
  );

  process.stdout.write('Measuring J2 (/rccp)…\n');
  const j2 = await runSamples(
    page,
    async (p) => { await p.getByRole('button', { name: /^RCCP$/i }).click(); },
    waitForRccp,
  );

  process.stdout.write('Measuring J3 (return /)…\n');
  const j3 = await runSamples(
    page,
    async (p) => {
      await p.getByRole('button', { name: /Master plan purchase orders|Purchase orders/i }).first().click();
    },
    waitForBoard,
  );

  await browser.close();

  const backlog = buildBacklog({ j1, j2, j3, frequency, profile: PROFILE });
  const report = buildReport({ j1, j2, j3, loginInfo, perfReady, frequency, backlog });

  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2), 'utf8');
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  let baseline = {};
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
      baseline = {};
    }
  }

  baseline.date = new Date().toISOString().slice(0, 10);
  baseline.environment = BASE_URL;
  baseline.profile = PROFILE;
  baseline.runsPerAction = RUNS;
  baseline.scoutJourneys = {
    J1: { label: 'PO board-load /', median: j1.warm, dominant: j1.dominantPost, labels: j1.labels },
    J2: { label: 'Route /rccp', median: j2.warm, dominant: j2.dominantPost, labels: j2.labels },
    J3: {
      label: 'Return / after /rccp',
      median: j3.warm,
      dominant: j3.dominantPost,
      labels: j3.labels,
      duplicatePoFetchMedian: j3.poFetchMedian,
    },
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf8');

  const hudPublic = {
    label: 'Scout baseline (pre-fix)',
    updatedAt: baseline.date,
    environment: BASE_URL,
    profile: PROFILE,
    hudWatch: [
      {
        id: 'po-full-read',
        label: 'PO board — full read',
        pathIncludes: '/data/purchase-orders',
        pathExcludes: '/revision',
        method: 'GET',
        baselineMs: j1.warm.apiSum ?? null,
        journey: 'J1',
      },
      {
        id: 'po-revision',
        label: 'PO board — revision check',
        pathIncludes: '/revision',
        method: 'GET',
        baselineMs: 80,
        journey: 'J3',
      },
      {
        id: 'rccp-analysis',
        label: 'RCCP analysis load',
        pathIncludes: '/rccp',
        method: 'GET',
        baselineMs: j2.warm.apiSum || 800,
        journey: 'J2',
      },
    ],
    scoutJourneys: {
      J1: { elapsedWall: j1.warm.elapsedWall, apiSum: j1.warm.apiSum, app: j1.warm.app },
      J2: { elapsedWall: j2.warm.elapsedWall, apiSum: j2.warm.apiSum },
      J3: {
        elapsedWall: j3.warm.elapsedWall,
        apiSum: j3.warm.apiSum,
        duplicatePoFetch: j3.poFetchMedian,
      },
    },
  };
  fs.writeFileSync(
    path.join(__dirname, '..', 'public', 'perf-baseline.json'),
    JSON.stringify(hudPublic, null, 2),
    'utf8',
  );

  const statePath = path.join(REPORT_DIR, 'perf-pipeline-state.json');
  const runMode = process.env.PERF_RUN_MODE || 'scout-only';
  const existingState = fs.existsSync(statePath)
    ? (() => { try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return {}; } })()
    : {};
  fs.writeFileSync(statePath, JSON.stringify({
    ...existingState,
    runId: existingState.runId || `perf-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}Z`,
    status: runMode === 'full' ? 'running' : 'paused',
    runMode: existingState.runMode || runMode,
    mode: runMode === 'full' ? 'loop' : 'scout-only',
    iteration: existingState.iteration ?? 0,
    maxIterations: existingState.maxIterations ?? 10,
    l5ExperimentsUsed: existingState.l5ExperimentsUsed ?? 0,
    currentPhase: runMode === 'full' ? 'scroll' : 'loop',
    backlogItemId: existingState.backlogItemId ?? null,
    environmentUrl: BASE_URL,
    scoutProfiles: [...new Set([...(existingState.scoutProfiles || []), PROFILE])],
    startedAt: existingState.startedAt || new Date().toISOString(),
    scoutCompletedAt: new Date().toISOString(),
    backlogItems: backlog.items.length,
    topBacklogItem: backlog.items[0]?.id ?? null,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');

  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Backlog: ${BACKLOG_PATH}`);
  console.log(`Baseline: ${BASELINE_PATH}`);
  console.log(`State: ${statePath}`);
  console.log(`Top item: ${backlog.items[0]?.id} (score ${Math.round(backlog.items[0]?.priorityScore || 0)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
