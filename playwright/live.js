// playwright/live.js — PR #77: vendor BI-toegang + vendor-scope remarks/split-screen
// Twee perspectieven:
//   1. Admin  => vendor filter + "New chart" knop zichtbaar, D365 write-back actief
//   2. Vendor => vendor filter + "New chart" VERBORGEN, split-screen WEL zichtbaar, D365 write-back uitgeschakeld
//
// Vereiste env-vars:
//   TEST_BASE_URL        — preview URL (default: zie hieronder)
//   TEST_ADMIN_EMAIL     — admin e-mailadres
//   TEST_ADMIN_PASSWORD  — admin wachtwoord
//   TEST_VENDOR_EMAIL    — vendor e-mailadres (optioneel; vendor-scenario wordt overgeslagen als niet ingesteld)
//   TEST_VENDOR_PASSWORD — vendor wachtwoord

require("dotenv").config();
const { chromium } = require("playwright");
const fs   = require("fs");
const path = require("path");

const BASE_URL        = process.env.TEST_BASE_URL
  || "https://preview-vendor-scope-remarks-spl.graysand-65442c41.northeurope.azurecontainerapps.io";
const ADMIN_EMAIL     = process.env.TEST_ADMIN_EMAIL    || process.env.BOOTSTRAP_ADMIN_EMAIL    || "";
const ADMIN_PASSWORD  = process.env.TEST_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
const VENDOR_EMAIL    = process.env.TEST_VENDOR_EMAIL    || "";
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || "";

const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
const REPORT_PATH = path.join(
  __dirname, "..", "test-reports",
  `test-report-pr77-vendor-scope-${new Date().toISOString().slice(0, 10)}.md`
);

function ensureDirs() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
}

async function doLogin(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  const onLogin = await page.locator("input[type=\"password\"]").count() > 0;
  if (!onLogin) return;
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(3000);
}

async function doLogout(page) {
  try { await page.evaluate(() => fetch("/api/logout", { method: "POST" })); } catch (_) {}
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function testAdminPerspective(page, findings) {
  findings.push("\n### PERSPECTIEF 1 — Admin");
  await doLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-admin-na-login.png"), fullPage: true });
  findings.push("Ingelogd als admin");

  await page.goto(`${BASE_URL}/bi`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-admin-bi-pagina.png"), fullPage: true });

  const footer = await page.locator("footer").first().textContent().catch(() => "");
  findings.push(`Versie footer: "${footer.trim() || "(niet gevonden)"}"`);

  const newChartVisible = await page.getByRole("button", { name: /new chart/i }).isVisible().catch(() => false);
  findings.push(newChartVisible
    ? "PASS — New chart knop IS zichtbaar voor admin"
    : "FAIL — New chart knop NIET zichtbaar voor admin");

  const vendorFilterVisible = await page.locator("[class*=\"vendorField\"]").first().isVisible().catch(() => false);
  findings.push(vendorFilterVisible
    ? "PASS — Vendor filter IS zichtbaar voor admin"
    : "FAIL — Vendor filter NIET zichtbaar voor admin");

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-admin-bi-toolbar.png"), fullPage: true });

  await page.goto(`${BASE_URL}/purchase-orders`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-admin-po-pagina.png"), fullPage: true });

  await doLogout(page);
  findings.push("Admin uitgelogd");
}

async function testVendorPerspective(page, findings) {
  findings.push("\n### PERSPECTIEF 2 — Vendor");

  if (!VENDOR_EMAIL || !VENDOR_PASSWORD) {
    findings.push("OVERGESLAGEN — Geen vendor-credentials. Stel TEST_VENDOR_EMAIL + TEST_VENDOR_PASSWORD in.");
    return;
  }

  await doLogin(page, VENDOR_EMAIL, VENDOR_PASSWORD);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-vendor-na-login.png"), fullPage: true });
  findings.push(`Ingelogd als vendor (${VENDOR_EMAIL})`);

  await page.goto(`${BASE_URL}/bi`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-vendor-bi-pagina.png"), fullPage: true });

  const newChartVisible = await page.getByRole("button", { name: /new chart/i }).isVisible().catch(() => false);
  findings.push(!newChartVisible
    ? "PASS — New chart knop VERBORGEN voor vendor (canManage=false)"
    : "FAIL — New chart knop ten onrechte ZICHTBAAR voor vendor");

  const vendorFilterVisible = await page.locator("[class*=\"vendorField\"]").first().isVisible().catch(() => false);
  findings.push(!vendorFilterVisible
    ? "PASS — Vendor filter VERBORGEN voor vendor (eigen data, geen keuze)"
    : "FAIL — Vendor filter ten onrechte ZICHTBAAR voor vendor");

  await page.goto(`${BASE_URL}/purchase-orders`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-vendor-po-pagina.png"), fullPage: true });

  const d365Count = await page.locator("[aria-label*=\"D365\" i], [title*=\"D365\" i], [data-testid*=\"d365\" i]").count();
  findings.push(d365Count === 0
    ? "PASS — Geen D365 write-back indicator voor vendor (disableWriteBack actief)"
    : `FAIL — D365 indicator aanwezig voor vendor (${d365Count} element(en))`);

  const apiCalls = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/")) apiCalls.push({ url: res.url(), status: res.status() });
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-vendor-po-na-load.png"), fullPage: true });

  const forbidden = apiCalls.filter((r) => r.status === 403);
  findings.push(forbidden.length === 0
    ? "PASS — Geen 403 Forbidden op eigen PO-data (vendor scope correct)"
    : `FAIL — ${forbidden.length} verboden request(s) op eigen data`);

  await doLogout(page);
  findings.push("Vendor uitgelogd");
}

async function run() {
  ensureDirs();
  const findings = [`# PR #77 — Vendor BI + scope test\n\nURL: ${BASE_URL}\nDatum: ${new Date().toISOString()}`];
  const consoleErrors = [];

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Stel TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD in als env-vars.");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    await testAdminPerspective(page, findings);
    await testVendorPerspective(page, findings);
  } finally {
    await browser.close();
  }

  const report = [
    ...findings,
    "\n### Console errors",
    consoleErrors.length ? consoleErrors.map((e) => `- ${e}`).join("\n") : "- Geen",
    "\n### Screenshots",
    "- 01-admin-na-login.png",
    "- 02-admin-bi-pagina.png",
    "- 03-admin-bi-toolbar.png",
    "- 04-admin-po-pagina.png",
    "- 05-vendor-na-login.png  (alleen bij vendor-credentials)",
    "- 06-vendor-bi-pagina.png (alleen bij vendor-credentials)",
    "- 07-vendor-po-pagina.png (alleen bij vendor-credentials)",
    "- 08-vendor-po-na-load.png (alleen bij vendor-credentials)",
  ].join("\n");

  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(report);
}

run().catch((err) => { console.error(err); process.exit(1); });
