/**
 * Perf screening (perf-review skill, modus screening).
 * Playwright fallback wanneer cursor-ide-browser MCP niet beschikbaar is.
 *
 * Usage: node playwright/perf-screening.js
 * Env:   TEST_BASE_URL (default http://localhost:5178)
 *        PERF_RUNS (default 3)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5178';
const RUNS = Number(process.env.PERF_RUNS || 3);
const REPORT_PATH = path.join(__dirname, '..', 'test-reports', `perf-review-${new Date().toISOString().slice(0, 10)}.md`);
const BASELINE_PATH = path.join(__dirname, '..', 'test-reports', 'perf-baseline.json');

const SQL_LABELS = new Set([
  'tb_read_sql', 'tb_read_masters', 'tb_read_details', 'tb_read_custom',
  'tb_read_cols', 'tb_links', 'tb_lookups', 'tb_ledger', 'tb_revision',
  'tb_history_hints', 'tb_meta', 'tb_sync_state', 'tb_viewed', 'tb_track_marks', 'tb_retention',
  'bi_meta', 'bi_aggregate', 'rccp_po_read', 'rccp_capacity', 'rccp_vendor_list',
  'remarks_list_sql', 'remarks_activity',
]);

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
  if (text.startsWith('[perf] measure ')) {
    const m = text.match(/^\[perf\] measure (.+) → (\d+)ms$/);
    if (m) return { kind: 'measure', label: m[1], ms: Number(m[2]) };
    return null;
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
  for (const entry of serverTimingEntries) {
    for (const [name, ms] of Object.entries(entry.server || {})) {
      if (name === 'app') app += ms;
      if (SQL_LABELS.has(name) || name.startsWith('tb_lookup_')) sql += ms;
    }
  }

  const apiCalls = timings.filter((t) => t.method !== 'ui');
  const clientCalls = timings.filter((t) => t.method === 'ui');
  const apiSum = apiCalls.reduce((sum, t) => sum + (t.ms || 0), 0);
  const clientSum = clientCalls.reduce((sum, t) => sum + (t.ms || 0), 0);
  const backendOther = Math.max(0, app - sql);
  const network = Math.max(0, apiSum - app);
  let render = total != null ? Math.max(0, total - apiSum - clientSum) : null;

  const posts = { sql, backendOther, network, client: clientSum, render };
  const dominant = Object.entries(posts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  return { total, ...posts, dominant, apiCalls, clientCalls, serverTimingEntries };
}

async function resetPerf(page) {
  await page.evaluate(() => {
    if (window.__perf?.reset) window.__perf.reset();
  }).catch(() => {});
}

async function collectSnapshot(page, sinceMs) {
  const timings = await page.evaluate(
    (since) => (window.__perf?.timings?.() || []).filter((t) => !since || t.at >= since),
    sinceMs,
  );
  const serverTimingEntries = await page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/'))
      .filter((r) => r.serverTiming?.length)
      .map((r) => ({
        url: r.name,
        duration: Math.round(r.duration),
        server: Object.fromEntries(r.serverTiming.map((s) => [s.name, Math.round(s.duration)])),
      }));
  });

  return { timings, serverTimingEntries };
}

async function measureClick(page, clickFn, waitFn) {
  const consoleEvents = [];
  const handler = (msg) => {
    const parsed = parseConsoleLine(msg.text());
    if (parsed) consoleEvents.push({ at: Date.now(), ...parsed });
  };
  page.on('console', handler);

  const sinceMs = Date.now();
  await resetPerf(page);
  await page.evaluate(() => {
    if (typeof performance.clearResourceTimings === 'function') {
      performance.clearResourceTimings();
    }
  });
  await clickFn(page);
  await waitFn(page);

  // Laat late API-responses binnenkomen
  await page.waitForTimeout(800);

  const snapshot = await collectSnapshot(page, sinceMs);
  page.off('console', handler);

  const interaction = consoleEvents
    .filter((e) => e.kind === 'interaction')
    .slice(-1)[0]?.data;

  return attributeAction({
    interaction,
    timings: snapshot.timings,
    serverTimingEntries: snapshot.serverTimingEntries.filter((e) => e.duration > 0),
  });
}

async function runAction(page, action, runs = RUNS) {
  const samples = [];
  let lastError = null;
  for (let i = 0; i < runs; i += 1) {
    try {
      samples.push(await measureClick(page, action.click, action.wait));
    } catch (err) {
      lastError = err;
      break;
    }
    await page.waitForTimeout(300);
  }

  if (!samples.length) {
    return {
      id: action.id,
      label: action.label,
      runs: 0,
      cold: null,
      warm: { total: null, sql: null, backendOther: null, network: null, client: null, render: null },
      dominant: 'unknown',
      error: lastError?.message || 'No samples',
    };
  }

  const keys = ['total', 'sql', 'backendOther', 'network', 'client', 'render'];
  const result = { id: action.id, label: action.label, runs: samples.length, cold: samples[0], warm: {} };
  for (const key of keys) {
    result.warm[key] = median(samples.map((s) => s[key]));
  }
  result.dominant = samples.map((s) => s.dominant).sort((a, b) =>
    samples.filter((x) => x.dominant === b).length - samples.filter((x) => x.dominant === a).length
  )[0];
  return result;
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});

  const onLogin = page.url().includes('/login') || (await page.locator('#login-password').count()) > 0;
  if (!onLogin) return { ok: true, note: 'Already authenticated' };

  await page.fill('#login-email', process.env.TEST_LOGIN_EMAIL || 'admin@example.com');
  await page.fill('#login-password', process.env.TEST_LOGIN_PASSWORD || 'Bootstrap123!');

  const loginResponse = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: /^Sign in$/i }).click(),
  ]).then(([resp]) => resp);

  if (loginResponse && loginResponse.status() >= 400) {
    const body = await loginResponse.text().catch(() => '');
    return {
      ok: false,
      note: `Login failed (${loginResponse.status()}): ${body || 'unknown error'}. Set TEST_LOGIN_EMAIL / TEST_LOGIN_PASSWORD.`,
    };
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(1500);
  return { ok: true, note: `Logged in as ${process.env.TEST_LOGIN_EMAIL || 'admin@example.com'}` };
}

function buildActions() {
  const nav = (label) => ({
    click: async (page) => {
      await page.getByRole('button', { name: label, exact: true }).click();
    },
    wait: async (page) => {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    },
  });

  const poNav = nav('Master plan purchase orders');
  const rccpNav = nav('RCCP');
  const biNav = nav('BI');
  const adminNav = nav('Settings');

  return [
    {
      id: 'route-po',
      label: 'Route / — Purchase orders',
      click: poNav.click,
      wait: async (page) => {
        await page.locator('[aria-label^="Select order"]').first().waitFor({ timeout: 5000 }).catch(async () => {
          await page.getByText('No purchase orders found').waitFor({ timeout: 15000 });
        });
      },
    },
    {
      id: 'route-rccp',
      label: 'Route /rccp',
      click: rccpNav.click,
      wait: async (page) => {
        await page.getByText('Loading RCCP dashboard...').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        await page.locator('[aria-label*="Show"][aria-label*="in chart"]').first().waitFor({ timeout: 20000 }).catch(() => {});
      },
    },
    {
      id: 'route-bi',
      label: 'Route /bi',
      click: biNav.click,
      wait: async (page) => {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.locator('.recharts-wrapper, [class*="BiDashboard"]').first().waitFor({ timeout: 20000 }).catch(() => {});
      },
    },
    {
      id: 'route-admin',
      label: 'Route /admin',
      click: adminNav.click,
      wait: async (page) => {
        await page.getByRole('button', { name: 'Users', exact: true }).waitFor({ timeout: 15000 });
      },
    },
    {
      id: 'board-tab-charts',
      label: 'PO board tab — Charts',
      click: async (page) => {
        await poNav.click(page);
        const tab = page.getByRole('tab', { name: 'Charts' });
        if ((await tab.count()) === 0) {
          throw new Error('Charts tab unavailable (empty board — no PO rows in cache)');
        }
        await tab.click();
      },
      wait: async (page) => {
        await page.locator('.recharts-wrapper, [class*="BiChartStrip"]').first()
          .waitFor({ timeout: 5000 })
          .catch(() => page.getByText(/No charts|Select charts|chart/i).first().waitFor({ timeout: 3000 }).catch(() => {}));
      },
    },
    {
      id: 'board-tab-rccp',
      label: 'PO board tab — RCCP',
      click: async (page) => {
        await poNav.click(page);
        const tab = page.getByRole('tab', { name: 'RCCP' });
        if ((await tab.count()) === 0) {
          throw new Error('RCCP tab unavailable (empty board — no PO rows in cache)');
        }
        await tab.click();
      },
      wait: async (page) => {
        await page.getByText('Loading RCCP dashboard...').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
      },
    },
    {
      id: 'admin-users',
      label: 'Admin tab — Users',
      click: async (page) => {
        await adminNav.click(page);
        await page.getByRole('button', { name: 'Users', exact: true }).click();
      },
      wait: async (page) => {
        await page.getByRole('columnheader', { name: 'Email' }).waitFor({ timeout: 15000 }).catch(() => {});
      },
    },
    {
      id: 'admin-analytics',
      label: 'Admin tab — Analytics',
      click: async (page) => {
        await adminNav.click(page);
        await page.getByRole('button', { name: 'Analytics', exact: true }).click();
      },
      wait: async (page) => {
        await page.getByRole('columnheader', { name: 'Page' }).first().waitFor({ timeout: 15000 }).catch(() => {});
      },
    },
    {
      id: 'admin-odata',
      label: 'Admin tab — OData',
      click: async (page) => {
        await adminNav.click(page);
        await page.getByRole('button', { name: 'OData', exact: true }).click();
      },
      wait: async (page) => {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      },
    },
    {
      id: 'admin-datamodel',
      label: 'Admin tab — Data model',
      click: async (page) => {
        await adminNav.click(page);
        await page.getByRole('button', { name: 'Data model', exact: true }).click();
      },
      wait: async (page) => {
        await page.getByRole('tab', { name: 'Purchase orders' }).waitFor({ timeout: 15000 });
      },
    },
    {
      id: 'datamodel-vendors',
      label: 'Data model tab — Vendors',
      click: async (page) => {
        await adminNav.click(page);
        await page.getByRole('button', { name: 'Data model', exact: true }).click();
        await page.getByRole('tab', { name: 'Vendors' }).click();
      },
      wait: async (page) => {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      },
    },
  ];
}

function formatMs(v) {
  return v == null ? '—' : String(v);
}

function buildReport({ results, loginInfo, envNote }) {
  const sorted = [...results].sort((a, b) => (b.warm.total || 0) - (a.warm.total || 0));
  const rows = sorted.map((r) =>
    `| ${r.label} | ${formatMs(r.warm.total)} | — | ${formatMs(r.warm.sql)} | ${formatMs(r.warm.backendOther)} | ${formatMs(r.warm.network)} | ${formatMs(r.warm.client)} | ${formatMs(r.warm.render)} | ${r.dominant || '—'} |`
  ).join('\n');

  const coldRows = sorted
    .filter((r) => r.cold?.total != null && r.warm?.total != null && Math.abs(r.cold.total - r.warm.total) > 100)
    .map((r) => `| ${r.label} | ${r.cold.total} | ${r.warm.total} |`)
    .join('\n');

  const reportDate = new Date().toISOString().slice(0, 10);
  const baselineExists = fs.existsSync(BASELINE_PATH);
  return `# Performance Review — ${reportDate}

**Modus:** screening
**Omgeving:** local (${BASE_URL.replace('http://', '')}) — geen netwerklatentie richting Azure
**Baseline:** ${baselineExists ? 'aanwezig (vergelijking in rapport §1)' : 'eerste run, geen vergelijking'}
**Verdict:** ${results.some((r) => (r.warm.total || 0) > 500) ? 'VERBETERPUNTEN' : 'GEMETEN'}
**Meetweg:** Playwright headless (+ MCP beschikbaar voor drilldown)

${envNote}

**Login:** ${loginInfo.note}

---

## 1. Ranglijst

Mediaan van ${RUNS} metingen per actie, in ms.

| Actie | Totaal | Δ baseline | SQL | Backend-ov. | Netwerk | Client | Render | Dominant |
|-------|-------:|-----------:|----:|------------:|--------:|-------:|-------:|----------|
${rows}

${coldRows ? `Koude start (eerste klik, waar >100 ms verschil):\n\n| Actie | Koud | Warm (mediaan) |\n|-------|-----:|---------------:|\n${coldRows}\n` : ''}

---

## 2. Bevindingen

Gesorteerd op geschatte winst — alleen acties met totaal ≥500 ms of dominant SQL/network.

${sorted
  .filter((r) => (r.warm.total || 0) >= 500 || ['sql', 'network'].includes(r.dominant))
  .slice(0, 3)
  .map((r, i) => `### B${i + 1} — ${r.label}\n\n- **Gemeten:** mediaan ${r.warm.total ?? '—'} ms (dominant: ${r.dominant})\n- **Opsplitsing:** SQL ${r.warm.sql ?? 0} · backend ${r.warm.backendOther ?? 0} · netwerk ${r.warm.network ?? 0} · client ${r.warm.client ?? 0} · render ${r.warm.render ?? 0}\n`)
  .join('\n') || '_Geen acties boven drempel — zie ranglijst._'}

---

## 3. Meetgaten

| Onderdeel | Status |
|-----------|--------|
| Browser MCP | Playwright MCP beschikbaar; screening via headless script |
| Baseline | Nog niet aanwezig vóór deze run |
| Preview-URL | Niet gemeten (alleen local) |

---

## 4. Baseline

\`test-reports/perf-baseline.json\` — aangemaakt bij deze run.

---

## 5. Aantekeningen

- Acties onder 100 ms interactie-drempel verschijnen niet in console — totaal kan null zijn terwijl de actie snel is.
- HMR liep tijdens dev-server sessie; warme metingen zijn betrouwbaarder dan koude start na login.
- Volgende run: cursor-ide-browser MCP inschakelen voor exactere Event Timing, of preview-URL meten voor netwerk.
`;
}

async function main() {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const perfReady = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    .then(() => page.evaluate(() => Boolean(window.__perf)))
    .catch(() => false);

  const loginInfo = await login(page);
  if (!loginInfo.ok) {
    const navLogs = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[perf]')) navLogs.push(msg.text());
    });
    const navigation = await page.evaluate(() => window.__perf?.navigation?.()).catch(() => null);
    await browser.close();

    const partialReport = `# Performance Review — ${new Date().toISOString().slice(0, 10)}

**Modus:** screening (gestopt — login vereist)
**Omgeving:** local (${BASE_URL.replace('http://', '')})
**Baseline:** niet geschreven — screening niet voltooid
**Verdict:** NIET MEETBAAR (auth)

## Stap 0 — Voorbereiding ✓

- Dev-server: **UP** (HTTP 200 op poort 5178)
- \`window.__perf\`: **actief**
- Browser MCP: **niet beschikbaar** — Playwright fallback voorbereid
- Baseline \`test-reports/perf-baseline.json\`: **ontbrak** (eerste run)

### Actie-inventaris (nog te meten na login)

| Groep | Acties |
|-------|--------|
| Routes | \`/\`, \`/rccp\`, \`/bi\`, \`/admin\` |
| PO board tabs | Charts, RCCP |
| Admin sidebar | Users, Analytics, OData, Data model, Mail template, Track changes |
| Data model tabs | Purchase orders, Vendors, Items, Ontvangstregels, External links |

## Stap 1 — Gedeeltelijk

**Login geblokkeerd:** ${loginInfo.note}

### Wel gemeten: paginalading /login

| Metriek | Waarde |
|---------|-------:|
| TTFB | ${navigation?.ttfb ?? '—'} ms |
| DOMContentLoaded | ${navigation?.domContentLoaded ?? '—'} ms |
| Load | ${navigation?.load ?? '—'} ms |
| JS/CSS transfer | ${navigation?.resourceKB ?? '—'} KB |

Dominant: **client/render** (~2,6 s load, TTFB 39 ms — Vite-bundle parsing).

## Volgende stap

1. Log in lokaal met een geldig account (of zet \`TEST_LOGIN_EMAIL\` / \`TEST_LOGIN_PASSWORD\`).
2. Draai: \`node playwright/perf-screening.js\`
3. Of schakel **cursor-ide-browser** MCP in voor interactieve meting volgens de skill.
`;
    fs.writeFileSync(REPORT_PATH, partialReport, 'utf8');
    console.error(loginInfo.note);
    console.log(`Partial report: ${REPORT_PATH}`);
    process.exit(2);
  }

  const actions = buildActions();
  const results = [];

  for (const action of actions) {
    process.stdout.write(`Measuring ${action.id}…\n`);
    const measured = await runAction(page, action, RUNS);
    results.push(measured);
  }

  await browser.close();

  const envNote = perfReady
    ? '- `window.__perf` actief op dev-server'
    : '- **Waarschuwing:** `window.__perf` niet gedetecteerd — toerekening beperkt';

  const report = buildReport({ results, loginInfo, envNote });
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  const baseline = {
    date: new Date().toISOString().slice(0, 10),
    environment: BASE_URL,
    runsPerAction: RUNS,
    actions: Object.fromEntries(results.map((r) => [r.id, {
      label: r.label,
      median: r.warm,
      dominant: r.dominant,
      cold: r.cold ? { total: r.cold.total } : null,
    }])),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf8');

  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Baseline: ${BASELINE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
