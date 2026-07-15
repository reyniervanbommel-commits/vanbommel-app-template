# RCCP — Rough Cut Capacity Planning (DevOps)

**Doel:** Voeg een RCCP-pagina toe die capaciteit per vendor/ISO-week/categorie opslaat en de PO-belasting live uit configureerbare PO-kolommen berekent, met Excel-import en admin-instellingen op het bestaande Table Builder-/app_settings-patroon.
**Referentie in repo:** [.cursor/plans/dev_rccp_pagina_plan_42afe88d.plan.md](../../.cursor/plans/dev_rccp_pagina_plan_42afe88d.plan.md)
**Tags:** rccp; capacity-planning; excel-import; dashboard; full-stack

---

## User story

**Als** inkoop-/capaciteitsplanner
**wil ik** per vendor, ISO-week en categorie de ingeplande capaciteit afzetten tegen de live PO-belasting
**zodat** ik over- en onderbezetting tijdig zie en kan bijsturen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Migratie `028_rccp_capacity.sql` draait idempotent (tweede run zonder fouten); `rccp_capacity` heeft `UNIQUE(vendor_account, period_year, iso_week, capacity_category)` en `rccp_import_batches` bestaat.
2. Er is een `/rccp`-pagina (lazy loaded, nav-item) die een matrix `categorie × periode` toont per `(vendor, ISO-week, categorie)` met available/confirmed/remaining/util% en correcte kleurcodering.
3. De kern-kleurregel klopt: `available=0 & confirmed=0` → grijs "N/A"; `available=0 & confirmed>0` → **rood "Ongepland"** (nooit grijs); `available>0` → groen/oranje/rood op basis van de drempels. Status altijd kleur **én** tekstlabel.
4. PO-belasting wordt **live** berekend via `TableDataService.read()` (geen aparte cache), begrensd op het gevraagde periodevenster, met `excludedStatuses` uitgesloten en PO's zonder datum in een aparte waarschuwingskaart.
5. Capaciteit is handmatig te beheren (CRUD) én via Excel-import (template-download, preview met geldig/fout/duplicate, commit met `rccp_import_batches`-record); foutieve regels blokkeren geldige niet.
6. Admin-instellingen (RCCP-tab): kolomkeuze (datum/aantal/categorie uit PO-kolommen), statusfilter, drempelpercentages, duplicate policy; PUT is admin-only en wordt geaudit.
7. Supplier ziet alleen de eigen vendor (read-only, schrijf-UI disabled); vendor in de querystring wordt genegeerd. Dedicated middleware `rccpAccess.js` op `/api/rccp/*`.
8. Tests groen voor ISO-week (week 53, jaarovergang), import-validatie en analysis-aggregatie/supplier-scope; `docs/guides/RCCP.md` aanwezig; `src/config/version.js` opgehoogd.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| PO-leeslaag (master+detail+fk_join) om te hergebruiken | server/services/TableDataService.js + tb_cache |
| Supplier-scope helpers | server/utils/supplierScope.js |
| Kolom-endpoint voor admin-selects | GET /api/data/:tableKey/columns?scope= (server/routes/data.js) |
| Excel-parse/preview-patroon | server/services/ExcelLinkService.js + src/components/admin/datamodel/ExcelLinkWizard.jsx |
| App-settings-patroon | server/services/SettingsService.js + dbo.app_settings |
| Charts (recharts) | src/components/admin/UserAnalytics.jsx |
| Kolom-select UI-patroon | src/components/admin/SupplierFilterColumnSelect.jsx |

---

## Backlog — child User Stories

### Story A: Migratie 028 + settings API/tab
**Beschrijving:** Datamodel en admin-instellingen neerzetten als fundament: tabellen, RccpSettingsService en de RCCP-admintab met kolomkeuze.
**Acceptatiecriteria:**
1. Migratie `028_rccp_capacity.sql` idempotent (`IF NOT EXISTS`), non-destructief; `rccp_capacity` met UNIQUE-constraint + `rccp_import_batches`.
2. RCCP-tab in `AdminPage.jsx`; 3 kolom-selects gevuld uit `GET /api/data/purchase-orders/columns`; `PUT /api/admin/rccp/settings` admin-only + audit-log.
3. Settings-panel toont waarschuwing bij wijzigen van `categoryColumnKey` (bestaande capaciteitsregels blijven aan oude categoriewaarden gekoppeld).

### Story B: Capacity CRUD + Excel-import
**Beschrijving:** Capaciteit handmatig beheren en via Excel importeren (preview → commit met batch-record).
**Acceptatiecriteria:**
1. Toevoegen/bewerken/verwijderen van een capaciteitsregel respecteert de UNIQUE-key (duplicate → foutmelding of upsert).
2. Template-download levert een `.xlsx` met de 5 canonieke kolommen (VendorCode | Year | ISOWeek | CapacityCategory | CapacityQuantity).
3. Import-preview toont geldig/fout/duplicate; foutieve regels blokkeren geldige niet; commit levert samenvatting + `rccp_import_batches`-record. Duplicate policy `update`/`skip` (geen per-duplicate `ask` in v1).

### Story C: Analysis-service + dashboard
**Beschrijving:** Live PO-belasting berekenen en visualiseren (matrix, KPI-cards, chart) met correcte nul-capaciteit-kleurregel.
**Acceptatiecriteria:**
1. `RccpAnalysisService` hergebruikt `TableDataService.read()`, begrensd op het periodevenster, gewrapt in `time()`.
2. Matrix toont available/confirmed/remaining/util% met kleurregel incl. rood "Ongepland" bij `confirmed>0 & available=0`.
3. Week/maand-toggle werkt; `excludedStatuses` uitgesloten; PO's zonder datum in aparte waarschuwingskaart; Unclassified-bucket zichtbaar.

### Story D: Drill-down + supplier-scope
**Beschrijving:** Vanuit een matrix-cel doorklikken naar de onderliggende PO-regels, met read-only supplier-toegang.
**Acceptatiecriteria:**
1. Klik op cel opent `RccpDrillDownPanel` met de PO-regels (ordernr, regel, item, aantal, datum, status); master-fallback toont badge "Date from order header".
2. Dedicated middleware `rccpAccess.js`: staff volledig, supplier GET-only met geforceerde eigen `vendorAccount`.
3. Supplier ziet schrijf-UI disabled en alleen eigen vendor.

### Story E: Tests + documentatie + versie
**Beschrijving:** Dekking en gebruikersdocumentatie afronden.
**Acceptatiecriteria:**
1. `isoWeek.test.js`, `RccpImportService.test.js`, `RccpAnalysisService.test.js` groen (week 53/jaarovergang, aggregatie zonder dubbeltelling, missing date/category, status-filter, supplier-scope).
2. `docs/guides/RCCP.md` beschrijft template, categorie-koppeling en settings.
3. `src/config/version.js` opgehoogd.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_rccp_pagina_plan_42afe88d.plan.md](../../.cursor/plans/dev_rccp_pagina_plan_42afe88d.plan.md); wijzig dit bestand bij nieuwe afspraken.
