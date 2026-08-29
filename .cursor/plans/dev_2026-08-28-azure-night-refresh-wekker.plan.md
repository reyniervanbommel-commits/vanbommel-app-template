# Azure-wekker D365 night refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productie-night-refresh start om 03:00 `Europe/Amsterdam` (DST) via een Azure Logic App, met dezelfde bestaande night-API; GitHub-cron blijft tot fase 2.

**Architecture:** Logic App Consumption (`vendorportal-night-refresh-prod`) vuurt Recurrence 03:00 W. Europe Standard Time, haalt het token via managed identity uit Key Vault, POSTet `POST /api/internal/night-refresh`. Bij HTTP-falen POSTet zij `POST /api/internal/night-refresh/start-failed` (geen retry); de app maalt via ACS naar `NIGHT_REFRESH_ALERT_EMAILS`. `RefreshRunService.js` blijft ongemoeid.

**Tech Stack:** Express, Vitest, ACS Email, Bicep `Microsoft.Logic/workflows`, Azure Key Vault RBAC, GitHub Actions `deploy-prod.yml`.

**Spec:** [docs/specs/2026-08-28-azure-night-refresh-wekker-design.md](../docs/specs/2026-08-28-azure-night-refresh-wekker-design.md)

## Global Constraints

- UI-copy Engels; geen Nederlandse strings in `src/` of user-facing API-errors.
- `RefreshRunService.js` niet wijzigen (al >300 regels).
- Night-API fail-closed: alleen `APP_ENV=production`, Bearer-token ≥32, timing-safe.
- Geen `az keyvault secret show` in workflows; token niet in git, logs, mail of Logic App run history (`secureData` op HTTP-acties).
- Fase 1: `.github/workflows/night-refresh-prod.yml` blijft. Fase 2 pas ná één groene Logic App-nacht.
- Geen Logic App op DEV/preview; niet in `infra/azure/main.bicep`.
- PATCH `src/config/version.js` bij code-wijziging (nu `v1.52.55` → `v1.52.56` in fase 1).
- Geen SQL-migratie. Geen commit/push tenzij de gebruiker dat in de uitvoeringssessie vraagt (local-first), behalve binnen `develop-from-devops`.

## File map

| Bestand | Rol |
|---|---|
| `server/services/EmailService.js` | `buildNightWekkerFailedContent` + `sendNightRefreshWekkerFailed` |
| `server/services/EmailService.test.js` | Token-waarde mag niet in mail |
| `server/services/NightRefreshWekkerAlert.js` | Body-sanitize, recipients, Express-handler |
| `server/services/NightRefreshWekkerAlert.test.js` | Co-located tests |
| `server/server.js` | Limiter + één `app.post` glue |
| `src/components/admin/d365RefreshInfoCopy.js` | Info-tekst Azure + 03:00 Europe/Amsterdam |
| `src/components/admin/d365RefreshInfoCopy.test.js` | Assert geen GitHub / 00:00 UTC |
| `infra/azure/night-refresh-wekker.bicep` | Logic App + KV role assignment |
| `.github/workflows/deploy-prod.yml` | Idempotente deploy-stap ná health |
| `docs/devops/262-d365-night-refresh.md` | Wekker-docs fase 1 |
| `src/config/version.js` | PATCH |
| `.github/workflows/night-refresh-prod.yml` | **Niet verwijderen in fase 1** |

---

### Task 1: Wekker-failed mail in EmailService

**Files:**
- Modify: `server/services/EmailService.js`
- Modify: `server/services/EmailService.test.js`

**Interfaces:**
- Consumes: bestaande `getClient()`, `ACS_FROM_EMAIL`
- Produces: `buildNightWekkerFailedContent({ httpStatus, message })` → `{ subject, html, plainText }`; `sendNightRefreshWekkerFailed({ recipients, httpStatus, message })` → `{ skipped: boolean }`

- [ ] **Step 1: Write the failing test**

Voeg toe aan `server/services/EmailService.test.js`:

```js
const { buildNightWekkerFailedContent } = require('./EmailService');

describe('EmailService wekker failed', () => {
  it('bouwt Engelse copy zonder token-waarde of Bearer', () => {
    const token = 'n'.repeat(32);
    const content = buildNightWekkerFailedContent({
      httpStatus: 503,
      message: `Unauthorized Bearer ${token} NIGHT_REFRESH leak`,
    });
    expect(content.subject).toBe('D365 night refresh did not start');
    expect(content.plainText).toContain('503');
    expect(content.plainText).not.toContain(token);
    expect(content.html).not.toContain(token);
    expect(content.plainText).not.toMatch(/Bearer/i);
    expect(content.html).toContain('&lt;'); // escaped if message had < — use message with <
  });
});
```

Gebruik in de test `message: \`boom <script> Bearer ${token}\`` en assert `html` bevat `&lt;script&gt;` en niet de token-waarde.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/EmailService.test.js`

Expected: FAIL (`buildNightWekkerFailedContent` is not a function).

- [ ] **Step 3: Write minimal implementation**

In `EmailService.js`, naast de bestaande digest-helpers:

```js
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNightWekkerFailedContent({ httpStatus, message } = {}) {
  const statusLabel = httpStatus == null ? 'unknown' : String(httpStatus);
  const safeMessage = String(message || 'No details').slice(0, 200);
  const subject = 'D365 night refresh did not start';
  const plainText = [
    'The Azure night-refresh alarm could not start the D365 refresh.',
    `HTTP status: ${statusLabel}`,
    `Detail: ${safeMessage}`,
  ].join('\n');
  return {
    subject,
    html: `<p>${escapeHtml(plainText).replace(/\n/g, '<br/>')}</p>`,
    plainText,
  };
}

async function sendNightRefreshWekkerFailed({ recipients, httpStatus, message } = {}) {
  const client = getClient();
  const senderAddress = process.env.ACS_FROM_EMAIL;
  const to = (Array.isArray(recipients) ? recipients : []).filter(Boolean);
  if (!client || !senderAddress || !to.length) {
    console.warn('[EmailService] ACS not configured or no recipients; wekker-failed mail skipped');
    return { skipped: true };
  }
  const content = buildNightWekkerFailedContent({ httpStatus, message });
  const poller = await client.beginSend({
    senderAddress,
    content,
    recipients: { to: to.map((address) => ({ address })) },
  });
  await poller.pollUntilDone();
  return { skipped: false };
}
```

Exporteer `sendNightRefreshWekkerFailed` en `buildNightWekkerFailedContent` in `module.exports`.

**Let op:** `buildNightWekkerFailedContent` redacteert het token **niet** — dat doet Task 2 vóór de call. De test in Step 1 moet dan een message meegeven die al gesaneerd is **of** Task 1-test alleen escape + subject checkt zonder token in de input. Pas de test aan: token-redactie zit in Task 2; Task 1 assert subject, escape van `<`, en dat een meegegeven token-string wél in de body zou staan als je die doorgeeft — nee, spec wil tests op mail zonder token-waarde. Doe token-redactie in `buildNightWekkerFailedContent` ook: vervang `process.env.NIGHT_REFRESH_TOKEN` in `safeMessage` door `[redacted]` als de env gezet is. Dan slaagt de Task 1-test en is er defense-in-depth.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run server/services/EmailService.test.js`

Expected: PASS.

- [ ] **Step 5: Commit** (alleen als de gebruiker om een commit vraagt, of binnen develop-from-devops)

```bash
git add server/services/EmailService.js server/services/EmailService.test.js
git commit -m "feat: ACS mail when night wekker cannot start"
```

---

### Task 2: NightRefreshWekkerAlert module

**Files:**
- Create: `server/services/NightRefreshWekkerAlert.js`
- Create: `server/services/NightRefreshWekkerAlert.test.js`

**Interfaces:**
- Consumes: `settingsService.getAsync`, `parseAlertEmails` uit `server/utils/alertEmails.js`, `emailService.sendNightRefreshWekkerFailed`
- Produces: `sanitizeWekkerFailedBody(body)` → `{ httpStatus, message }`; `notifyWekkerStartFailed(body)` → `{ sent: boolean }`; `handleStartFailed(req, res)` Express-handler

- [ ] **Step 1: Write the failing test**

```js
'use strict';

process.env.NIGHT_REFRESH_TOKEN = 'n'.repeat(32);

const emailService = require('./EmailService');
const settingsService = require('./SettingsService');

vi.mock('./EmailService', () => ({
  sendNightRefreshWekkerFailed: vi.fn(),
}));
vi.mock('./SettingsService', () => ({
  getAsync: vi.fn(),
}));

const {
  sanitizeWekkerFailedBody,
  notifyWekkerStartFailed,
  handleStartFailed,
} = require('./NightRefreshWekkerAlert');

describe('NightRefreshWekkerAlert', () => {
  beforeEach(() => {
    emailService.sendNightRefreshWekkerFailed.mockReset();
    settingsService.getAsync.mockReset();
  });

  it('redacteert token-waarde en Bearer, kapt op 200 tekens', () => {
    const token = 'n'.repeat(32);
    const result = sanitizeWekkerFailedBody({
      httpStatus: 401,
      message: `Bearer ${token} extra NIGHT_REFRESH ${'x'.repeat(300)}`,
    });
    expect(result.httpStatus).toBe(401);
    expect(result.message).not.toContain(token);
    expect(result.message).not.toMatch(/Bearer/i);
    expect(result.message.length).toBeLessThanOrEqual(200);
  });

  it('verwerpt ongeldige httpStatus', () => {
    expect(sanitizeWekkerFailedBody({ httpStatus: 99 }).httpStatus).toBeNull();
    expect(sanitizeWekkerFailedBody({ httpStatus: 'nope' }).httpStatus).toBeNull();
  });

  it('skipped mail zonder recipients', async () => {
    settingsService.getAsync.mockResolvedValue('');
    const result = await notifyWekkerStartFailed({ httpStatus: 503, message: 'down' });
    expect(result.sent).toBe(false);
    expect(emailService.sendNightRefreshWekkerFailed).not.toHaveBeenCalled();
  });

  it('stuurt mail via ACS bij recipients', async () => {
    settingsService.getAsync.mockResolvedValue('ops@example.com');
    emailService.sendNightRefreshWekkerFailed.mockResolvedValue({ skipped: false });
    const result = await notifyWekkerStartFailed({ httpStatus: 503, message: 'down' });
    expect(result.sent).toBe(true);
    expect(emailService.sendNightRefreshWekkerFailed).toHaveBeenCalledTimes(1);
  });

  it('ACS-fout levert sent false zonder throw', async () => {
    settingsService.getAsync.mockResolvedValue('ops@example.com');
    emailService.sendNightRefreshWekkerFailed.mockRejectedValue(new Error('ACS down'));
    const result = await notifyWekkerStartFailed({ httpStatus: 500, message: 'x' });
    expect(result.sent).toBe(false);
  });

  it('handleStartFailed antwoordt 202', async () => {
    settingsService.getAsync.mockResolvedValue('');
    const req = { body: { httpStatus: 503, message: 'nope' } };
    const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await handleStartFailed(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ sent: false });
  });
});
```

Pas mocks aan het echte export-patroon van `EmailService` (`module.exports` object) — `vi.mock` met factory die `sendNightRefreshWekkerFailed` mockt én de rest doorgeeft, of assign na require zoals `RefreshRunService.test.js`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/NightRefreshWekkerAlert.test.js`

Expected: FAIL (module ontbreekt).

- [ ] **Step 3: Write minimal implementation**

`server/services/NightRefreshWekkerAlert.js`:

```js
'use strict';

const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const emailService = require('./EmailService');
const { parseAlertEmails } = require('../utils/alertEmails');

const ALERT_EMAILS_KEY = 'NIGHT_REFRESH_ALERT_EMAILS';
const MAX_MESSAGE = 200;

function sanitizeWekkerFailedBody(body = {}) {
  const rawStatus = Number(body.httpStatus);
  const httpStatus = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus
    : null;
  let message = String(body.message || '').trim();
  const token = String(process.env.NIGHT_REFRESH_TOKEN || '');
  if (token) message = message.split(token).join('[redacted]');
  message = message.replace(/Bearer/gi, '').replace(/NIGHT_REFRESH/gi, '').replace(/\s+/g, ' ').trim();
  if (message.length > MAX_MESSAGE) message = message.slice(0, MAX_MESSAGE);
  return { httpStatus, message };
}

async function notifyWekkerStartFailed(body) {
  const { httpStatus, message } = sanitizeWekkerFailedBody(body);
  try {
    const raw = await settingsService.getAsync(ALERT_EMAILS_KEY, '');
    const recipients = parseAlertEmails(raw);
    if (!recipients.length) return { sent: false };
    const result = await emailService.sendNightRefreshWekkerFailed({ recipients, httpStatus, message });
    return { sent: !result?.skipped };
  } catch (err) {
    logger.warn('Wekker-failed mail mislukt', { error: err.message });
    return { sent: false };
  }
}

async function handleStartFailed(req, res) {
  const result = await notifyWekkerStartFailed(req.body || {});
  return res.status(202).json({ sent: result.sent });
}

module.exports = { sanitizeWekkerFailedBody, notifyWekkerStartFailed, handleStartFailed };
```

Houd dit bestand onder 120 regels. Geen JSX, geen `RefreshRunService`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run server/services/NightRefreshWekkerAlert.test.js server/services/EmailService.test.js`

Expected: PASS.

- [ ] **Step 5: Commit** (alleen op verzoek / develop-from-devops)

```bash
git add server/services/NightRefreshWekkerAlert.js server/services/NightRefreshWekkerAlert.test.js
git commit -m "feat: night wekker start-failed alert helper"
```

---

### Task 3: Route glue in server.js

**Files:**
- Modify: `server/server.js` (nu ~296 regels — glue max ~10 regels; niet over 300)

**Interfaces:**
- Consumes: `handleStartFailed`, `requireNightRefreshToken`
- Produces: `POST /api/internal/night-refresh/start-failed`

- [ ] **Step 1: Check line count**

Tel `server/server.js`. Als de toevoeging ≥300 zou maken: extraheer de twee bestaande night-routes plus de nieuwe naar `server/routes/internalNightRefresh.js` (alleen verplaatsen, geen gedragswijziging). Dat extraheert ~20 regels uit `server.js`. Alleen doen als anders 300+ dreigt.

- [ ] **Step 2: Write a focused route test** (mini-app, zelfde patroon als `admin.d365-refresh.test.js`)

Create `server/routes/internalNightRefresh.start-failed.test.js` of test via `handleStartFailed` (al in Task 2). Als je een HTTP-test wilt: mini Express-app met `express.json()`, mock `APP_ENV=production` + token, POST zonder token → 401; POST met token → 202.

- [ ] **Step 3: Implement glue** Direct na de bestaande night-refresh POST/GET in `server/server.js`:

```js
const nightRefreshWekkerAlert = require('./services/NightRefreshWekkerAlert');

const nightRefreshStartFailedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Try again in one minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  '/api/internal/night-refresh/start-failed',
  nightRefreshStartFailedLimiter,
  requireNightRefreshToken,
  nightRefreshWekkerAlert.handleStartFailed,
);
```

Require bovenaan bij de andere requires. **Niet** `RefreshRunService` aanpassen.

- [ ] **Step 4: Run tests**

Run: `npx vitest run server/utils/nightRefreshToken.test.js server/services/NightRefreshWekkerAlert.test.js`

Expected: PASS. `server.js` < 300 regels.

- [ ] **Step 5: Commit** (op verzoek)

```bash
git add server/server.js
git commit -m "feat: POST /api/internal/night-refresh/start-failed"
```

---

### Task 4: Settings info-copy

**Files:**
- Modify: `src/components/admin/d365RefreshInfoCopy.js`
- Create: `src/components/admin/d365RefreshInfoCopy.test.js`
- Modify: `src/config/version.js` (`v1.52.55` → `v1.52.56`)

- [ ] **Step 1: Failing test**

```js
import { describe, expect, it } from 'vitest';
import { D365_REFRESH_INFO } from './d365RefreshInfoCopy';

describe('D365_REFRESH_INFO', () => {
  it('noemt Azure Logic App en 03:00 Europe/Amsterdam, niet GitHub cron', () => {
    expect(D365_REFRESH_INFO).toMatch(/Azure Logic App/i);
    expect(D365_REFRESH_INFO).toMatch(/03:00/);
    expect(D365_REFRESH_INFO).toMatch(/Europe\/Amsterdam/);
    expect(D365_REFRESH_INFO).not.toMatch(/GitHub Actions/);
    expect(D365_REFRESH_INFO).not.toMatch(/00:00 UTC/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/components/admin/d365RefreshInfoCopy.test.js`

- [ ] **Step 3: Replace copy**

```js
export const D365_REFRESH_INFO = 'Night refresh runs once a day in production via an Azure Logic App at 03:00 Europe/Amsterdam (summer and winter). It starts the same D365 run as the Start button. Staff and vendors see new and changed frames until they click Mark as seen — each person for themselves. If someone doesn\'t click Mark as seen, frames older than 14 days fade away automatically; no data is deleted, only the "new/changed" highlight stops applying to older changes.';
```

`D365_REFRESH_SERVER_HINT` ongewijzigd.

Zet `APP_VERSION` op `v1.52.56`.

- [ ] **Step 4: Tests**

Run: `npx vitest run src/components/admin/d365RefreshInfoCopy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit** (op verzoek)

```bash
git add src/components/admin/d365RefreshInfoCopy.js src/components/admin/d365RefreshInfoCopy.test.js src/config/version.js
git commit -m "feat: D365 refresh copy for Azure 03:00 wekker"
```

---

### Task 5: Bicep Logic App

**Files:**
- Create: `infra/azure/night-refresh-wekker.bicep`

**Interfaces:**
- Consumes: params `prodAppUrl`, `keyVaultName`, `location`
- Produces: Logic App `vendorportal-night-refresh-prod` + role assignment Key Vault Secrets User op secret `night-refresh-token-prod`

- [ ] **Step 1: Write Bicep** (geen runtime-test lokaal verplicht; `az bicep build` als Azure CLI er is)

```bicep
targetScope = 'resourceGroup'

@description('Publieke origin van vendorportal-prod, zonder trailing slash.')
param prodAppUrl string

@description('Key Vault naam met secret night-refresh-token-prod.')
param keyVaultName string

param location string = resourceGroup().location

param logicAppName string = 'vendorportal-night-refresh-prod'
param nightRefreshSecretName string = 'night-refresh-token-prod'

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource nightRefreshSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' existing = {
  parent: keyVault
  name: nightRefreshSecretName
}

resource wekker 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    state: 'Enabled'
    parameters: {
      prodAppUrl: {
        type: 'String'
        value: prodAppUrl
      }
    }
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      parameters: {
        prodAppUrl: {
          type: 'String'
        }
      }
      triggers: {
        Recurrence: {
          type: 'Recurrence'
          recurrence: {
            frequency: 'Day'
            interval: 1
            schedule: {
              hours: [
                3
              ]
              minutes: [
                0
              ]
            }
            timeZone: 'W. Europe Standard Time'
          }
          runtimeConfiguration: {
            concurrency: {
              runs: 1
            }
          }
        }
      }
      actions: {
        Get_token: {
          type: 'Http'
          inputs: {
            method: 'GET'
            uri: '${keyVault.properties.vaultUri}secrets/${nightRefreshSecretName}?api-version=7.4'
            authentication: {
              type: 'ManagedServiceIdentity'
              audience: 'https://vault.azure.net'
            }
          }
          runtimeConfiguration: {
            secureData: {
              properties: [
                'inputs'
                'outputs'
              ]
            }
          }
        }
        Start_night_refresh: {
          type: 'Http'
          runAfter: {
            Get_token: [
              'Succeeded'
            ]
          }
          inputs: {
            method: 'POST'
            uri: '@{parameters(\'prodAppUrl\')}/api/internal/night-refresh'
            headers: {
              Authorization: 'Bearer @{body(\'Get_token\')?[\'value\']}'
              'Content-Type': 'application/json'
            }
            retryPolicy: {
              type: 'fixed'
              count: 3
              interval: 'PT20S'
            }
          }
          runtimeConfiguration: {
            contentTransfer: {
              transferMode: 'Chunked'
            }
            secureData: {
              properties: [
                'inputs'
                'outputs'
              ]
            }
          }
          limit: {
            timeout: 'PT1M'
          }
        }
        Notify_start_failed: {
          type: 'Http'
          runAfter: {
            Start_night_refresh: [
              'Failed'
              'TimedOut'
            ]
          }
          inputs: {
            method: 'POST'
            uri: '@{parameters(\'prodAppUrl\')}/api/internal/night-refresh/start-failed'
            headers: {
              Authorization: 'Bearer @{body(\'Get_token\')?[\'value\']}'
              'Content-Type': 'application/json'
            }
            body: {
              httpStatus: '@{coalesce(outputs(\'Start_night_refresh\')?[\'statusCode\'], json(null))}'
              message: 'Night refresh HTTP start failed'
            }
            retryPolicy: {
              type: 'none'
            }
          }
          runtimeConfiguration: {
            secureData: {
              properties: [
                'inputs'
                'outputs'
              ]
            }
          }
        }
      }
      outputs: {}
    }
  }
}

resource secretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(nightRefreshSecret.id, wekker.id, kvSecretsUserRoleId)
  scope: nightRefreshSecret
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: wekker.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

Als Bicep de `@{...}`-strings niet accepteert: zet de workflow `definition` in een `var workflowDefinition object = loadJsonContent('night-refresh-wekker.definition.json')` naast dit bestand. Geen token in die JSON.

- [ ] **Step 2: Build**

Run: `az bicep build --file infra/azure/night-refresh-wekker.bicep`

Expected: geen errors. Los quote-escaping op tot build slaagt.

- [ ] **Step 3: Commit** (op verzoek)

```bash
git add infra/azure/night-refresh-wekker.bicep
git commit -m "feat: Bicep Logic App for 03:00 night refresh"
```

---

### Task 6: deploy-prod.yml — Logic App ná health

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`

- [ ] **Step 1: Voeg stap toe ná “Deploy-validatie (health + revision)”, vóór of ná D365-check — ná health is verplicht zodat FQDN leeft**

Nieuwe step `Logic App night-refresh wekker`:

```yaml
      - name: Logic App night-refresh wekker
        run: |
          set -euo pipefail
          FQDN="$(az containerapp show --name "$APP_NAME" --resource-group "$ACA_RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
          PROD_URL="https://${FQDN}"
          echo "Wekker target: ${PROD_URL}/api/internal/night-refresh"
          az deployment group create \
            --resource-group "$ACA_RESOURCE_GROUP" \
            --name vendorportal-night-refresh-wekker \
            --template-file infra/azure/night-refresh-wekker.bicep \
            --parameters prodAppUrl="$PROD_URL" keyVaultName="$KEY_VAULT_NAME"
```

**Verboden:** `az keyvault secret show`, `echo` van tokens, GitHub `secrets.NIGHT_REFRESH_TOKEN` in deze stap.

`KEY_VAULT_NAME` bestaat al als env van de job (`KEY_VAULT_NAME_PROD`).

- [ ] **Step 2: YAML visueel checken** — `night-refresh-prod.yml` niet verwijderen.

- [ ] **Step 3: Commit** (op verzoek)

```bash
git add .github/workflows/deploy-prod.yml
git commit -m "feat: deploy Azure Logic App wekker on prod"
```

---

### Task 7: Docs fase 1

**Files:**
- Modify: `docs/devops/262-d365-night-refresh.md`

- [ ] **Step 1:** Vervang “GitHub workflow cron 00:00 UTC” als **enige** wekker door: productie-wekker = Logic App 03:00 W. Europe Standard Time; GitHub `night-refresh-prod.yml` blijft tijdelijk (fase 1 overlap, `attached: true`). Link naar de spec.

- [ ] **Step 2: Commit** (op verzoek)

```bash
git add docs/devops/262-d365-night-refresh.md docs/specs/2026-08-28-azure-night-refresh-wekker-design.md
git commit -m "docs: night refresh wekker moves to Azure Logic App"
```

---

### Task 8: Verificatie fase 1 (lokaal)

- [ ] **Step 1:** `npx vitest run server/services/EmailService.test.js server/services/NightRefreshWekkerAlert.test.js src/components/admin/d365RefreshInfoCopy.test.js`
- [ ] **Step 2:** `npm test` (geen regressie)
- [ ] **Step 3:** Bevestig `git diff --stat` raakt **niet** `server/services/RefreshRunService.js` en **niet** `.github/workflows/night-refresh-prod.yml`
- [ ] **Step 4:** Op DEV na merge: Settings-copy zichtbaar; `POST /api/internal/night-refresh/start-failed` zonder prod-env → 503
- [ ] **Step 5:** Op PROD na `deploy-prod` approve: Logic App bestaat; Portal Run Trigger één keer (office hours) → Night-run in historie; run history toont **geen** Authorization-header

---

### Task 9: Fase 2 — GitHub-wekker eruit (NIET in dezelfde PR als fase 1)

**Pas uitvoeren ná minstens één geslaagde Logic App-run rond 03:00 NL.**

**Files:**
- Delete: `.github/workflows/night-refresh-prod.yml`
- GitHub UI/API: verwijder secrets `PROD_APP_URL` en `NIGHT_REFRESH_TOKEN`
- Modify: `docs/devops/262-d365-night-refresh.md` (alleen Logic App)
- Modify: `src/config/version.js` PATCH

- [ ] **Step 1:** Verwijder de workflow-file
- [ ] **Step 2:** Verwijder de twee GitHub-secrets
- [ ] **Step 3:** Docs + PATCH
- [ ] **Step 4:** `npm test`
- [ ] **Step 5:** Commit (op verzoek) `chore: remove GitHub night-refresh cron`

---

## Self-review

| Spec-eis | Task |
|---|---|
| 03:00 Europe/Amsterdam DST | Task 5 Recurrence + timeZone |
| Bestaande POST night-refresh | Task 5 Actie 1; geen tweede startpad |
| Fire-and-forget, geen 45-min poll | Task 5 |
| Fail-mail dezelfde alert-adressen | Task 1–3 |
| Geen RefreshRunService | File map + Task 8 check |
| Token niet in logs | Task 5 secureData; Task 6 geen secret show |
| Fase 1 GitHub blijft | Task 6–8; Task 9 later |
| UI Engels 03:00 | Task 4 |
| PATCH footer | Task 4 / 9 |

Geen TBD in de taken hierboven.
