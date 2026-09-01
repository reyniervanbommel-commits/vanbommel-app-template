# Azure-wekker voor D365 night refresh

## BRD

**Als** admin
**wil ik** dat de productie-night-refresh elke nacht om 03:00 Nederlandse tijd start
**zodat** inkopers, medewerkers en leveranciers 's ochtends verse D365-data zien, zonder dat GitHub Actions de start uren uitstelt.

**Probleem nu:** De wekker is GitHub Actions cron `0 0 * * *` (00:00 UTC). GitHub houdt zich niet aan die klok: op 24–26 augustus startte de job rond 01:16 UTC (~03:16 NL), op 27 augustus om 07:55 UTC (~09:55 NL) en op 28 augustus om 09:59 UTC (~11:59 NL). De Container App start wél meteen zodra GitHub belt. Het schema is bovendien UTC, niet `Europe/Amsterdam`.

**Succes (toetsbaar):**
- De night-run op PROD start om **03:00 `Europe/Amsterdam`**, zomer én winter (DST), met een marge van hooguit enkele minuten — geen uren.
- Historie in Settings → D365 refresh toont `Night` met `started_at` rond 03:00 lokale tijd.
- GitHub Actions start de night refresh **niet meer** (geen `schedule`, geen backup-wekker). Bestand `.github/workflows/night-refresh-prod.yml` verdwijnt.
- Handmatige **Start** in de admin-UI blijft werken.

**Non-goals:**
- Geen wijziging aan de refresh-cascade, token-auth, alert-mails of Seen-kaders.
- Geen night refresh op DEV of preview (`APP_ENV=production` blijft fail-closed).
- Geen GitHub-cron of `workflow_dispatch` als tweede wekker.
- Geen extra always-on replica alleen voor deze wekker (PROD heeft al `min-replicas 1`).
- Geen in-app `node-cron` in `vendorportal-prod`.

**Constraints:**
- Bestaande `POST /api/internal/night-refresh` + Bearer `NIGHT_REFRESH_TOKEN` blijft de enige start van een night-run.
- Alleen `APP_ENV=production`; token minstens 32 tekens; timing-safe compare.
- OTAP: wekker-resource alleen op PROD; geen directe prod-config zonder het bestaande deploy-pad.
- UI-taal blijft Engels; Settings-info tekst moet de Azure-wekker en 03:00 `Europe/Amsterdam` noemen i.p.v. GitHub / 00:00 UTC.
- Azure-regel: Container Apps only; geen App Service.

## FRD

**Gekozen approach:** Azure Logic App (Consumption) in dezelfde PROD-resource group als `vendorportal-prod`. Recurrence **03:00** met tijdzone **W. Europe Standard Time** (`Europe/Amsterdam`, DST). Eén HTTP-actie: `POST /api/internal/night-refresh` met Bearer-token. De app (`vendorportal-prod`) blijft Container App.

**Afgewezen:**
- Azure Function Timer — extra Function App, zelfde HTTP-call, meer infra.
- Container Apps Job — cron is UTC-only; winter wordt 02:00 NL en schendt het BRD.

### Happy path
1. Elke nacht om 03:00 Nederlandse tijd vuurt de Logic App.
2. Zij POST naar de bestaande night-refresh-API op PROD.
3. De server start dezelfde cascade als de knop **Start** (`source=night`).
4. De Logic App stopt na HTTP 202 (fire-and-forget, korte retry bij netwerkfout). De run loopt door op de server.
5. Admin ziet in Settings → D365 refresh een `Night`-regel met start rond 03:00. Inkopers/leveranciers zien verse data en kaders zoals nu.

### Rollen
- **Logic App** is de wekker (geen gebruiker).
- **Admin** ziet historie, info-tekst, alert-adressen, en kan **Start** handmatig klikken.
- **Employee/vendor** merken alleen verse data; geen wekker-UI.
- **Ops:** Run Trigger in Azure Portal mag als noodknop (vervangt GitHub `workflow_dispatch`).

### Overlap
Twee starts tegelijk (Logic App + admin-Start, of een tweede Portal-run): bestaande API geeft 202 `attached: true` als er al een run loopt. Geen tweede cascade.

### Fout
- Night-run start wel maar faalt/interrupted/entity-error → bestaande ACS-digest naar `NIGHT_REFRESH_ALERT_EMAILS` (ongewijzigd).
- Logic App krijgt geen 202 (app down, 401, 503, timeout) ná retries → **extra mail** naar dezelfde alert-adressen: wekker kon de refresh niet starten. Geen stack, geen token in de mail.
- Als de Logic App helemaal niet afgaat (platform-storing): geen mail vanuit de app; zichtbaar in Logic App run history. Geen tweede GitHub-wekker.
- Als de Key Vault-token-fetch (`Get_token`) faalt: `Start_night_refresh` en `Notify_start_failed` worden beide geskipt (geen `runAfter`-match, en geen token om de alert-call zelf te authenticeren — kip-en-ei). Geen mail; alleen zichtbaar in Logic App run history. Geaccepteerd restrisico — geen extra always-on monitoring toegevoegd (BRD non-goal: geen extra infra alleen voor deze wekker).

### UI
Alleen de Engelse (i)-tekst op D365 refresh: Azure Logic App, 03:00 Europe/Amsterdam, niet GitHub / 00:00 UTC. Geen nieuw scherm, geen extra knop.

### Leeg / zichtbaarheid
Geen nieuwe empty state. Token en Logic App-URL blijven uit de UI. Historie blijft max 20 runs.

### Hergebruik
`POST /api/internal/night-refresh`, `NIGHT_REFRESH_TOKEN`, `EmailService` / alert-adressen, bestaande Start-knop en historie.

### Acceptatiecriteria
1. PROD night-run start ± enkele minuten na 03:00 Nederlandse tijd, zomer én winter.
2. Fase 1: `.github/workflows/night-refresh-prod.yml` blijft (overlap veilig via `attached`). Fase 2, ná één groene Logic App-nacht: workflow weg, GitHub start geen night-run meer.
3. Logic App: fire-and-forget POST; geen 45-minuten-poll.
4. HTTP-fout van de wekker → mail naar dezelfde alert-adressen.
5. Portal Run Trigger toegestaan; admin-Start ongewijzigd.
6. Info-copy in Settings is Engels en noemt Azure + 03:00 Europe/Amsterdam.
7. DEV/preview: geen Logic App, night-API blijft 503.

## TD

### Hergebruik
- Start night-run: bestaande `POST /api/internal/night-refresh` in `server/server.js` + `requireNightRefreshToken` in `server/utils/nightRefreshToken.js`. Geen tweede startpad.
- Token blijft in Key Vault `night-refresh-token-prod` (zelfde secret als `vendorportal-prod`).
- Alert-adressen: `SettingsService` key `NIGHT_REFRESH_ALERT_EMAILS`, `parseAlertEmails`, ACS via `server/services/EmailService.js`.
- Handmatige Start: ongewijzigd (`source=manual`).
- `GET /api/internal/night-refresh/status` blijft (debug); GitHub pollt hem niet meer.
- **`RefreshRunService.js` niet wijzigen** (al >300 regels). Wekker-fail-mail hoort niet bij run-state.

### Wekker-resource
Nieuwe Consumption Logic App **`vendorportal-night-refresh-prod`** in dezelfde resource group als `vendorportal-prod` (`ACA_RESOURCE_GROUP`). De **app** blijft Container App; de **wekker** is Logic App (FRD). Geen App Service, geen Function App, geen Container Apps Job.

Niet in `infra/azure/main.bicep`. Apart: `infra/azure/night-refresh-wekker.bicep`, alleen vanuit `deploy-prod.yml`.

- System-assigned managed identity op de Logic App.
- RBAC **Key Vault Secrets User** op secret `night-refresh-token-prod` (niet op de hele vault als dat te ruim is; anders één secret-scope).
- Runtime: actie “Key Vault — Get secret” met **secureOutputs**, daarna HTTP met **secureInputs + secureOutputs** op beide HTTP-acties. Authorization-header komt **niet** in Logic App run history.
- **Geen** `az keyvault secret show` in GitHub Actions. Bicep-parameter alleen `prodAppUrl` (FQDN). Token nooit als workflow-parameter, nooit `echo`.
- Tokenrotatie: Logic App leest KV at runtime; geen snapshot tot de volgende deploy.

Trigger: Recurrence, frequency Day, hour 3, minute 0, `timeZone: W. Europe Standard Time`. Concurrency 1.

Actie 1 — HTTP POST `{prodAppUrl}/api/internal/night-refresh`, Bearer uit KV-actie, timeout 60s, retry alleen 5xx/timeout (max 3, ~20s). Succes = HTTP 202. Geen poll.

Actie 2 — alleen `runAfter` Failed/TimedOut: POST `{prodAppUrl}/api/internal/night-refresh/start-failed`, zelfde Bearer, **geen retry**. Body zonder token/stack.

### Nieuw endpoint (dun)
`POST /api/internal/night-refresh/start-failed` — glue in `server/server.js` (alleen `app.post`, geen validatie-logica inline):
- Eigen limiter, bv. `nightRefreshStartFailedLimiter` 5/min — **niet** dezelfde bucket als de start-POST (retries van actie 1 mogen de fail-mail niet 429’en).
- `requireNightRefreshToken` (production-only, ≥32, timing-safe).
- Start **geen** refresh.

Nieuwe module `server/services/NightRefreshWekkerAlert.js` (klein, eigen `*.test.js`):
- Parse/valideer body: `httpStatus` optioneel int 100–599; `message` optioneel string, trim, max 200.
- Redacteer de **echte** `NIGHT_REFRESH_TOKEN`-waarde als die in `message` zit; strip case-insensitive `Bearer` / `NIGHT_REFRESH`.
- HTML-escape in de mail-body.
- Recipients via `settingsService.getAsync` + `parseAlertEmails`.
- `emailService.sendNightRefreshWekkerFailed({ recipients, httpStatus, message })`.
- ACS-fout: log zonder stack/token, response blijft 202 `{ sent: false }` — zelfde patroon als `sendNightMailSafe`.

Response: 202 `{ "sent": true|false }`. App down → actie 2 faalt ook; geen mail; Logic App-run Failed in Azure.

Mail Engels: subject `D365 night refresh did not start`. Tests asserten dat de **token-waarde** niet in subject/body zit.

### Git-pad en cutover (twee fases)
OTAP: `feature/<id>-azure-night-wekker` → PR naar `develop` (DEV: UI-copy, endpoint 503) → PR `develop`→`main` → approve `deploy-prod`. Nooit push naar `main`, geen Logic App met de hand aanmaken.

**Fase 1 (eerste PR-reeks tot prod-deploy):** Bicep + deploy-stap + app-code (`start-failed`, info-copy, tests). GitHub-workflow `night-refresh-prod.yml` **blijft**. Overlap is veilig (`attached: true`).

**Fase 2 (ná minstens één groene Logic App-run om ~03:00 NL):** verwijder `.github/workflows/night-refresh-prod.yml`; verwijder GitHub-secrets `PROD_APP_URL` en `NIGHT_REFRESH_TOKEN` (verplicht in deze fase, niet optioneel). **Gedaan 2026-09-01** na groene Night-run 03:00:25.

Geen Logic App op DEV/preview. `deploy-dev.yml` / `preview.yml` ongemoeid.

### UI
`src/components/admin/d365RefreshInfoCopy.js`: Azure Logic App, 03:00 Europe/Amsterdam; geen GitHub, geen 00:00 UTC. Tests bijwerken.

### Schema
Geen SQL-migratie.

### Auth / security
- Geen session op internal routes; Bearer fail-closed.
- Alleen HTTPS naar bestaande FQDN.
- CORS n.v.t.
- Token niet in URL, GitHub-logs, Logic App run history, mail of UI.
- Portal Run Trigger mag (FRD); run history toont geen Authorization dankzij secureData.

### Perf
Eén start-POST; geen 45-minuten-poll; geen extra `apiRequest` in de UI.

### Versie
PATCH in `src/config/version.js` per fase die code wijzigt.

### Docs
`docs/devops/262-d365-night-refresh.md` bijwerken per fase (fase 1: beide wekkers; fase 2: alleen Logic App).

### Aantoonbaar
1. Logic App run history: 03:00 NL, HTTP 202, **geen** Bearer in inputs/outputs.
2. Settings → D365 refresh: `Night` rond 03:00.
3. Portal Run Trigger: zelfde night-run.
4. Tests: wekker-failed mail zonder token-waarde; skip zonder recipients; token-middleware fail-closed; `RefreshRunService.js` ongewijzigd.
5. Fase 2: workflow “Night D365 refresh (production)” weg.
