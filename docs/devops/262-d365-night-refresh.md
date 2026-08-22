# D365 refresh — inzicht, night job en Seen (DevOps)

**Doel:** Eén D365-refresh-run (PO + cascade) met Settings-inzicht, per-gebruiker Mark as seen, en een GitHub-nachtwekker die dezelfde run start. Foutmails naar instelbare adressen.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-22-d365-night-refresh.plan.md](../../.cursor/plans/dev_2026-08-22-d365-night-refresh.plan.md)  
**Tags:** d365; refresh; night-job; seen  
**Work item:** Feature #AB:262 met child User Stories #AB:263–#AB:265

---

## User story

**Als** inkoper, medewerker of leverancier  
**wil ik** elke ochtend verse D365-data zien, zelf Mark as seen kunnen klikken, en als admin live + historische refresh-inzicht plus een nachtelijke productierun met foutmail  
**zodat** niemand handmatig hoeft te verversen, kaders per persoon kloppen, en een mislukte nachtrun zichtbaar is zonder een altijd-aan Azure-job.

---

## Acceptatiecriteria (definitie van "klaar")

1. Eén cascade-run via bestaande `POST /api/data/purchase-orders/refresh/start` (PO eerst, daarna lookup-targets). Night-token start dezelfde run (`source=night`).
2. Settings-sidebar **D365 refresh** alleen voor admin: live ProgressBars, historie max 20, alert-emails, Start, Engelse (i)-tekst. Employee ziet het item niet; API geeft 403.
3. Board-refreshknop: admin ziet huidige entiteit + overall balk uit dezelfde progress-poll; employee/vendor zien geen voortgang en pollen niet.
4. Default progress-payload houdt bestaande `progress` (fetched/saved/status/lookupWarnings) én voegt `run` toe; Settings gebruikt `?view=full`.
5. Mark as seen per user: `POST /purchase-orders/viewed` voor admin, employee én supplier; andere tableKeys blijven admin-only; `refresh/start` blijft admin-only.
6. Kaders: eigen `last_viewed_at`; `sinceMs = max(baseline, now-14d)` met `baseline = last_viewed_at ?? last_full_sync_at`. Inloggen telt niet als Seen. Ouder dan 14 dagen: highlight weg, data blijft.
7. Night: `POST /api/internal/night-refresh` fail-closed token (min 32), alleen `APP_ENV=production`, Bearer-header, POST 5/min. Al running → 202 `attached: true`.
8. Run-status: `error` alleen als PO zelf faalt; lookup-falen → entity.error + run.done. Night-mail bij error, interrupted, of minstens één entity.error. ACS-fout wijzigt run-status niet (`alert_status`).
9. GitHub workflow `night-refresh-prod.yml` cron 00:00 UTC, geen `environment: production`. `deploy-prod.yml` zet `NIGHT_REFRESH_TOKEN`, `ACS_CONNECTION_STRING` en `ACS_FROM_EMAIL`.
10. Migratie 041 idempotent; live in geheugen (1 SQL insert start + 1 batch einde); UI Engels; tests groen; versie PATCH.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Achtergrond-refresh + cascade na PO | `server/services/TableDataService.js` (`startRefresh`, `refreshLookupTargetsAfterPurchaseOrders`) |
| Progress-poll board + Data model | `GET /api/data/:tableKey/refresh/progress` |
| Admin-baseline Seen | `tb_user_view_state`, `getLastViewedAt` (MAX admin), `POST /:tableKey/viewed` admin-only |
| Supplier data-allowlist | `server/middleware/dataAccess.js` |
| ACS-mail | `server/services/EmailService.js` |
| App settings | `dbo.app_settings` + `SettingsService` |
| Prod-deploy secretref-patroon | `.github/workflows/deploy-prod.yml` |
| Admin-sidebar | `src/components/admin/AdminPage.jsx` |

---

## Backlog — child User Stories

### Story A (#AB:263): Refresh-run inzicht (Settings + board)
**Beschrijving:** Migratie `tb_refresh_runs` / `tb_refresh_run_entities`, `RefreshRunService`, live progress + historie, admin-tab, board-balk.  
**Acceptatiecriteria:**
1. Migratie 041 idempotent (`IF NOT EXISTS`): `tb_refresh_runs` + entities, `error_text NVARCHAR(500)`, `alert_status`, index `started_at DESC`.
2. Live in geheugen: 1 SQL insert bij start + 1 batch bij einde. Counts via MERGE OUTPUT (inserted/updated) en soft-delete OUTPUT (deleted).
3. `GET /api/data/:tableKey/refresh/progress` is `requireRole(ADMIN)`. Default payload: bestaande `progress` + `run`. Settings `?view=full` voegt `entities[]` + gestript `error_text` toe. `progress.lookupWarnings` blijft (Data model).
4. `GET /api/admin/d365-refresh/runs` limit default/max 20, admin-only.
5. Sidebar **D365 refresh** in AdminPage alleen voor admin; employee ziet het item niet; directe API 403.
6. Boardknop: admin ziet huidige stap + overall ProgressBar; employee/vendor geen voortgang en geen progress-poll.
7. Optimistic UI: queued slots = purchase-orders + lookup-targets uit `getLookups()`. Geen Fluent Tooltip in de historie-lijst.
8. `GET`/`PUT /api/admin/d365-refresh/alert-emails` via SettingsService, key `NIGHT_REFRESH_ALERT_EMAILS`.
9. Unit-tests snapshot-helper + RefreshRunService; UI Engels; versie PATCH.

### Story B (#AB:264): Per-user Seen + 14-dagenvenster
**Beschrijving:** Eigen `last_viewed_at` als kader-baseline; Mark as seen voor iedere rol met bordtoegang; ledger-read max 14 dagen.  
**Acceptatiecriteria:**
1. `getLastViewedAt(tableId, userId)` filtert `vs.user_id = @userId`. Call sites: `read()`, `readRowDetails()` (`req.user.id`), `getRevisionByTable` `userViewedAt`.
2. `POST /api/data/purchase-orders/viewed` voor admin, employee en supplier. Andere tableKeys blijven admin-only. `refresh/start` blijft admin-only.
3. dataAccess-allowlist: alleen `POST /purchase-orders/viewed` voor supplier; tests dekken viewed-pad en `refresh/start` 403.
4. UI `canMarkViewed=true` voor elke bordrol; titel `Mark changes as seen`.
5. `sinceMs = max(baseline, now-14d)` met `baseline = last_viewed_at ?? last_full_sync_at`. Inloggen is geen Seen.
6. Vendor Seen wist alleen eigen kaders. >14 dagen: highlight weg, data blijft.
7. Unit-tests seen-baseline + 14d-cap.

### Story C (#AB:265): Night-wekker, token en foutmail
**Beschrijving:** Interne token-routes starten dezelfde PO-run; GitHub cron alleen productie; ACS-digest bij fout; secrets in deploy-prod.  
**Acceptatiecriteria:**
1. `POST /api/internal/night-refresh` en `GET /status` zonder `requireSession`; Bearer-token min 32; niet-prod/te kort → 503; timing-safe compare.
2. POST extra rate-limit 5/min. Al running → 202 `{ attached: true, runId }`.
3. Statuscontract: `{ running, status, finishedAt, error_text }`. GH fail bij error/interrupted/timeout of `running=false` zonder `finishedAt`; success bij `status=done`.
4. `run.status=error` alleen als purchase-orders faalt. Lookup-falen: `entity.status=error`, `run.status=done`. Night-mail wel bij error, interrupted, of minstens één entity.error.
5. Mail asynchroon via bestaande ACS. ACS skip/fout wijzigt run-status niet; `alert_status`.
6. Process-start: SQL `running` → `interrupted`; night daarvan mailt wel.
7. `.github/workflows/night-refresh-prod.yml` cron `0 0 * * *`, geen `environment: production`.
8. `deploy-prod.yml` secretref voor `NIGHT_REFRESH_TOKEN`, `ACS_CONNECTION_STRING`, `ACS_FROM_EMAIL`.
9. Unit-tests token/attached/mail/cascade; geen localhost-E2E van night-HTTP.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-22-d365-night-refresh.plan.md](../../.cursor/plans/dev_2026-08-22-d365-night-refresh.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/262-d365-night-refresh.md
