# Azure-wekker D365 night refresh (DevOps)

**Doel:** Productie-night-refresh start om 03:00 Europe/Amsterdam (zomer en winter) via Azure Logic App; GitHub-cron verdwijnt pas in fase 2.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-28-azure-night-refresh-wekker.plan.md](../../.cursor/plans/dev_2026-08-28-azure-night-refresh-wekker.plan.md)  
**Spec:** [docs/specs/2026-08-28-azure-night-refresh-wekker-design.md](../specs/2026-08-28-azure-night-refresh-wekker-design.md)  
**Tags:** d365; night-refresh; azure; logic-app  
**Work item:** Feature #AB:291 met child User Stories #AB:292–#AB:294

---

## User story

**Als** admin  
**wil ik** dat de productie-night-refresh elke nacht om 03:00 Nederlandse tijd start  
**zodat** inkopers, medewerkers en leveranciers 's ochtends verse D365-data zien, zonder GitHub Actions-vertraging van uren.

---

## Acceptatiecriteria (definitie van "klaar")

1. PROD night-run start ± enkele minuten na 03:00 Nederlandse tijd, zomer én winter.
2. Bestaande `POST /api/internal/night-refresh` blijft de enige start van een night-run (Bearer-token, production-only).
3. Logic App fire-and-forget (HTTP 202); geen 45-minuten-poll.
4. HTTP-fout van de wekker → ACS-mail naar `NIGHT_REFRESH_ALERT_EMAILS` (geen token in mail/logs/run history).
5. Portal Run Trigger mag als noodknop; admin-Start ongewijzigd.
6. Settings-info (Engels) noemt Azure Logic App en 03:00 Europe/Amsterdam.
7. Fase 1: GitHub-workflow `night-refresh-prod.yml` blijft (overlap veilig via `attached`). Fase 2 ná één groene Logic App-nacht: workflow + GitHub-secrets `PROD_APP_URL` en `NIGHT_REFRESH_TOKEN` weg.
8. Geen Logic App op DEV/preview; `RefreshRunService.js` ongewijzigd; geen SQL-migratie.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Night-start API + token | `POST /api/internal/night-refresh`, `server/utils/nightRefreshToken.js` |
| Alert-adressen + ACS digest bij run-fout | `NIGHT_REFRESH_ALERT_EMAILS`, `EmailService.sendNightRefreshDigest` |
| GitHub-cron (fase 1 nog actief) | `.github/workflows/night-refresh-prod.yml` |
| PROD token in Key Vault | `night-refresh-token-prod` via `deploy-prod.yml` |

---

## Backlog — child User Stories

### Story A (#AB:292): Start-failed API en ACS-alert bij wekker-fout
**Beschrijving:** Als de Logic App de night-refresh niet kan starten, mailen naar dezelfde alert-adressen. Geen tweede startpad; RefreshRunService niet wijzigen.  
**Acceptatiecriteria:**
1. `POST /api/internal/night-refresh/start-failed` met `requireNightRefreshToken`, eigen 5/min limiter, start geen refresh.
2. `NightRefreshWekkerAlert` + EmailService: Engelse mail `D365 night refresh did not start`; token-waarde en Bearer niet in body/HTML.
3. Settings-copy Engels: Azure Logic App, 03:00 Europe/Amsterdam; geen GitHub / 00:00 UTC.
4. Unit-tests groen; PATCH in `version.js`; `server.js` onder 300 regels.

### Story B (#AB:293): Logic App 03:00 Europe/Amsterdam en prod-deploy
**Beschrijving:** Consumption Logic App `vendorportal-night-refresh-prod`, Recurrence 03:00 W. Europe Standard Time, token via managed identity uit Key Vault.  
**Acceptatiecriteria:**
1. `infra/azure/night-refresh-wekker.bicep`: system-assigned MI, Key Vault Secrets User op `night-refresh-token-prod`, HTTP-acties met secureInputs/secureOutputs.
2. Geen `az keyvault secret show` in GitHub Actions; `prodAppUrl` uit Container App FQDN.
3. `deploy-prod.yml` zet de Logic App idempotent ná health-check.
4. Fire-and-forget POST night-refresh; start-failed zonder retry; concurrency 1.
5. Portal Run Trigger werkt; run history toont geen Authorization-header.

### Story C (#AB:294): GitHub night-refresh cron verwijderen (fase 2)
**Beschrijving:** Pas ná minstens één groene Logic App-run rond 03:00 NL. Tot die tijd blijft `night-refresh-prod.yml`.  
**Acceptatiecriteria:**
1. `.github/workflows/night-refresh-prod.yml` verwijderd.
2. GitHub-secrets `PROD_APP_URL` en `NIGHT_REFRESH_TOKEN` verwijderd.
3. Docs bijgewerkt: enige wekker is de Logic App.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-28-azure-night-refresh-wekker.plan.md](../../.cursor/plans/dev_2026-08-28-azure-night-refresh-wekker.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/291-azure-night-refresh-wekker.md
