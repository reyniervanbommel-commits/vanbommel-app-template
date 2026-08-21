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
4. Weekkleur, segmenten, transparantie, achterstallig, ontvangstkleur, capaciteit, Today, hover/selectie en totalen kloppen met het grafiekcontract in het plan.
5. UI-teksten Engels; `openQty` altijd `max(0, orderedQty - deliveredQty)`; `plannedDate` ongewijzigd.
6. Supplier ziet alleen eigen vendor, read-only settings.
7. Unit-tests voor mapping/ISO-delay/overdue/totals; `npm test` groen; versie in `src/config/version.js` verhoogd.
8. Browser-check op `/rccp`: tab, vendor, grafiek, hover-detail, settings-reload.
9. `devTestItem` toegevoegd; `docs/guides/RCCP.md` bijgewerkt.

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
**Beschrijving:** Vier kolomkeuzes in RCCP-config, `GET /rccp/delivery-plan`, mapping van PO-regels, capaciteitssom per ISO-week, unit-tests.  
**Acceptatiecriteria:**
1. Sectie Delivery plan met vier dropdowns (qty alleen `rccpMeasure`; kolommen via `enriched=1`).
2. Config-keys in `RccpSettingsService` (JSON in bestaande app_settings, geen SQL-migratie).
3. `GET /rccp/delivery-plan` geeft `{ orders, weeks, weeklyCapacity, config }`; 400 zonder vendor (behalve supplier).
4. `openQty = max(0, orderedQty - deliveredQty)`; `plannedDate` nooit overschreven.
5. Geen plannedDate → overslaan; lege delivered-date/qty = niet geleverd; geen purchaseOrderNumber → `recordKey`.
6. Capaciteit = som `availableQty` per vendor+ISO-week; geen rij = geen lijn die week.
7. `differenceInIsoWeeks` in `isoWeek.js` (geen date-fns); unit-tests groen.
8. Validatie is nieuwe logica, geen bestaand precedent: `RccpSettingsService` valideert vandaag geen enkele kolomkey tegen de enriched-kolomlijst (`openMeasureKey` checkt alleen membership binnen de ingediende `quantityMeasures`; `dateColumnKey`/`vendorColumnKey` checken alleen non-empty, geen registry-lookup). De vier delivery-plan keys moeten echt tegen de live enriched-kolomlijst valideren (`rccpMeasure`-vlag voor de qty-keys, kolom-existentie voor de datumkeys), inclusief toegang tot `TableRegistryService` vanuit de normalize-functie.

### Story B (#AB:260): Delivery plan tab en grafiek
**Beschrijving:** Derde tab op `/rccp` met Recharts dual-axis grafiek volgens het grafiekcontract in het plan.  
**Acceptatiecriteria:**
1. Tab **Delivery plan** naast de bestaande tabs; die blijven ongewijzigd.
2. Weekvenster zichtbaar op Dashboard én Delivery plan; data alleen bij actieve tab + vendor.
3. Custom shapes (geen Bar-serie per order); planning boven, ontvangst onder met planweekkleur.
4. Capaciteit, Today, overdue-stroke en opacities volgens plan; Y-as gedeelde schaal.
5. UI Engels; geen Fluent Tooltip op segmenten; weekkleur stabiel per `year-Wxx` (Fluent tokens).
6. `useRccpPage` (dashboard-analyse) alleen enabled bij `activeTab === 'dashboard'`, naast de nieuwe gating van `useRccpDeliveryPlan`. Vandaag draait de dashboard-fetch in `useRccpPage.js` door zodra er een vendor gekozen is, ongeacht de actieve tab (`enabled = hasVendor`, niet tab-afhankelijk) — met een derde tab wordt die achtergrond-waste vaker geraakt.

### Story C (#AB:261): Delivery plan interactie, tests en documentatie
**Beschrijving:** Hover/selectie, verbindingslijn, detailregel, tooltip, docs, versie.  
**Acceptatiecriteria:**
1. Hover/klik markeert boven + onder en tekent één verbindingslijn (geen lijn zonder `deliveredDate`).
2. Detailregel en tooltip in het Engels volgens de copy in het plan; nooit `0w`.
3. `docs/guides/RCCP.md`, `devTestItem`, `measure()` rond client-groepering, versiebump.
4. Browser-checkbaar op `/rccp` (tab, vendor, grafiek, hover, settings-reload).
5. Commit-prefix `feat` + `#AB:258`.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md](../../.cursor/plans/dev_2026-08-20-rccp-delivery-plan.plan.md); plan aangevuld na review-plan-for-devops (gesloten aannames + grafiekcontract).
