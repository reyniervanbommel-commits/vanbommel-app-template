# RCCP Delivery Plan chart tab (DevOps)

**Doel:** Nieuwe RCCP-tab Delivery plan met een wekelijkse planning/ontvangst-grafiek op live PO-data. Admin kiest zelf de vier bronkolommen in de bestaande RCCP-instellingen. Het huidige dashboard blijft staan.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md](../../.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md)  
**Tags:** rccp; delivery-plan; chart; settings  
**Work item:** Feature #AB:258 met child User Stories #AB:259–#AB:261

---

## User story

**Als** planner  
**wil ik** op de RCCP-pagina een extra tab zien met een wekelijkse levergrafiek per leverancier (gepland vs ontvangen vs open vs capaciteit), waarbij ik zelf kies welke PO-kolommen de geplande datum, ontvangstdatum, bestelde hoeveelheid en geleverde hoeveelheid zijn  
**zodat** ik de nieuwe weergave kan vergelijken met het bestaande dashboard zonder dat dashboard te wijzigen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Derde tab **Delivery plan** op `/rccp`; Dashboard en Capacity planning ongewijzigd.
2. Admin kiest de vier bronkolommen in RCCP-instellingen; na Save herlaadt de tab.
3. Grafiek toont live regels van de gekozen leverancier in het weekvenster.
4. Weekkleur, segmenten, transparantie, achterstallig, ontvangstkleur, capaciteit, Today, hover/selectie en totalen kloppen met de specificatie.
5. UI-teksten Engels; `openQty` altijd berekend; `plannedDate` ongewijzigd.
6. Supplier ziet alleen eigen vendor, read-only settings.
7. Unit-tests voor mapping/ISO-delay/overdue/totals; `npm test` groen; versie in `src/config/version.js` verhoogd.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| RCCP-pagina met tabs Dashboard en Capacity planning | `src/components/rccp/RccpPageContent.jsx` |
| RCCP-instellingen met kolomkeuze | `src/components/rccp/RccpSettingsForm.jsx` + `server/services/RccpSettingsService.js` |
| Live PO-snapshot | `readBoardSnapshot` via `TableDataService` |
| Capaciteit per vendor/week/categorie | `server/services/RccpCapacityService.js` |
| ISO-weekhelpers | `server/utils/isoWeek.js` |
| Recharts op het bestaande dashboard | `src/components/rccp/RccpChartMatrixPanel.jsx` |

---

## Backlog — child User Stories

### Story A (#AB:259): Delivery plan settings en API
**Beschrijving:** Vier kolomkeuzes in RCCP-config, `GET /rccp/delivery-plan`, mapping van PO-regels naar het ordercontract, capaciteitssom per ISO-week, unit-tests.  
**Acceptatiecriteria:**
1. RCCP-instellingen hebben een sectie Delivery plan met vier dropdowns (qty alleen `rccpMeasure`).
2. Config-keys staan in `RccpSettingsService` (JSON in bestaande app_settings, geen SQL-migratie).
3. `GET /rccp/delivery-plan` geeft `{ orders, weeks, weeklyCapacity, config }` terug.
4. `openQty` is altijd `max(0, orderedQty - deliveredQty)`; `plannedDate` wordt nooit overschreven.
5. Lege delivered-date/qty = niet geleverd; regel zonder plannedDate wordt overgeslagen.
6. Capaciteit is som `availableQty` per vendor+ISO-week; unit-tests groen.

### Story B (#AB:260): Delivery plan tab en grafiek
**Beschrijving:** Derde tab op `/rccp` met Recharts dual-axis grafiek.  
**Acceptatiecriteria:**
1. Tab **Delivery plan** naast de bestaande tabs; die blijven ongewijzigd.
2. Weekvenster zichtbaar op Dashboard én Delivery plan; data alleen bij actieve tab + vendor.
3. Planning boven, ontvangst onder met planweekkleur; status, capaciteit, Today.
4. UI Engels; geen Fluent Tooltip op segmenten; weekkleur stabiel per `year-Wxx`.

### Story C (#AB:261): Delivery plan interactie, tests en documentatie
**Beschrijving:** Hover/selectie, verbindingslijn, detailregel, tooltip, docs, versie.  
**Acceptatiecriteria:**
1. Hover/klik markeert boven + onder en tekent één verbindingslijn (geen lijn zonder `deliveredDate`).
2. Detailregel en tooltip in het Engels; nooit `0w`.
3. `docs/guides/RCCP.md`, `devTestItem`, versiebump; commit `feat` + `#AB:258`.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md](../../.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md); wijzig dit bestand bij nieuwe afspraken.
