'use strict';

// Schrijft een compacte coverage-samenvatting naar de GitHub Actions job-summary (en de console),
// gebaseerd op coverage/coverage-summary.json (json-summary reporter in vitest.config.mjs).
// Draai na `npm run test:coverage`. Faalt nooit hard — puur informatief.

const fs = require('fs');
const path = require('path');

const SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const METRICS = ['lines', 'statements', 'functions', 'branches'];

function formatPct(metric) {
  if (!metric) return 'n/a';
  return `${metric.pct.toFixed(1)}% (${metric.covered}/${metric.total})`;
}

function main() {
  if (!fs.existsSync(SUMMARY_PATH)) {
    console.log('[print-coverage-summary] Geen coverage/coverage-summary.json gevonden — sla samenvatting over.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  const total = raw.total;
  if (!total) {
    console.log('[print-coverage-summary] coverage-summary.json bevat geen "total" — sla samenvatting over.');
    return;
  }

  const lines = [
    '### 📊 Vitest coverage',
    '',
    '| Metric | Coverage |',
    '|---|---|',
    ...METRICS.map((metric) => `| ${metric} | ${formatPct(total[metric])} |`),
    '',
    'Volledig HTML-rapport: zie de `coverage-report`-artifact van deze run.',
  ];
  const summary = lines.join('\n');
  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
}

main();
