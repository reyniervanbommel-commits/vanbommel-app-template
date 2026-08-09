'use strict';

// Niet-blokkerende Kwaliteitspoort-hint (zie CLAUDE.md → Kwaliteitspoort, punt 4 "Testen", en
// .cursor/rules/kwaliteitspoort.mdc). Signaleert gewijzigde bestanden in de kernmappen
// (server/services, server/middleware, server/utils, src/utils, src/hooks) zonder co-located
// testbestand. Faalt de build NOOIT — puur informatief in de CI-jobsummary; handhaving gebeurt
// bij code review, niet door een harde gate.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CORE_DIR_PATTERNS = [
  /^server\/services\//,
  /^server\/middleware\//,
  /^server\/utils\//,
  /^src\/utils\//,
  /^src\/hooks\//,
];

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function getBaseRef() {
  return process.env.GITHUB_BASE_REF || process.env.CHECK_BASE_REF || 'develop';
}

function getChangedFiles(baseRef) {
  try {
    run(`git fetch origin ${baseRef} --depth=1`);
  } catch {
    // Fetch kan al lokaal aanwezig zijn (bv. lokale run buiten CI) — gewoon doorgaan met diffen.
  }
  try {
    const output = run(`git diff --name-only --diff-filter=ACM origin/${baseRef}...HEAD`);
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch (err) {
    console.log(`[check-core-test-coverage] Kon diff tegen origin/${baseRef} niet bepalen (${err.message}) — sla check over.`);
    return [];
  }
}

function isTestFile(file) {
  return /\.test\.(js|jsx|ts|tsx)$/.test(file);
}

function isCoreFile(file) {
  return CORE_DIR_PATTERNS.some((pattern) => pattern.test(file));
}

// Voor Foo.js -> [Foo.test.js, Foo.test.jsx] (co-located hooks/components kunnen .jsx zijn).
function testFileCandidates(file) {
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  const altExt = ext === '.js' ? '.jsx' : ext === '.jsx' ? '.js' : ext;
  return Array.from(new Set([`${base}.test${ext}`, `${base}.test${altExt}`]));
}

function findMissing(changedFiles) {
  const coreFiles = changedFiles.filter((file) => isCoreFile(file) && !isTestFile(file));
  return coreFiles.filter((file) => {
    const candidates = testFileCandidates(file);
    const existsInRepo = candidates.some((candidate) => fs.existsSync(path.join(process.cwd(), candidate)));
    const addedInSameDiff = candidates.some((candidate) => changedFiles.includes(candidate));
    return !existsInRepo && !addedInSameDiff;
  });
}

function report(missing) {
  if (missing.length === 0) {
    console.log('[check-core-test-coverage] Alle gewijzigde kernbestanden hebben een test. ✅');
    return;
  }

  const lines = [
    '### ⚠️ Kwaliteitspoort — testdekking (niet-blokkerend)',
    '',
    'Deze bestanden in de kernmappen (`server/services`, `server/middleware`, `server/utils`, ' +
      '`src/utils`, `src/hooks`) zijn gewijzigd zonder een co-located testbestand. ' +
      'Zie `CLAUDE.md` → Kwaliteitspoort, punt 4 ("Testen"). Dit blokkeert de merge niet.',
    '',
    ...missing.map((file) => `- \`${file}\``),
  ];
  const summary = lines.join('\n');
  console.log(summary);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
}

function main() {
  const baseRef = getBaseRef();
  const changedFiles = getChangedFiles(baseRef);
  const missing = findMissing(changedFiles);
  report(missing);
  // Bewust altijd exit 0: dit is een hint, geen gate.
}

main();
