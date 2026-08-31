# PO-board: exception filter als quick-filter tab (DevOps)

**Doel:** Een klein dialoogje in het Tabs-menu waarmee een staff-gebruiker in één stap 2-4 kolomfilters combineert tot een nieuwe, direct toepasbare view-tab — zonder de bestaande view-tab-infrastructuur, opslag of API te wijzigen.
**Referentie in repo:** [docs/specs/2026-08-30-po-board-exception-saved-views-design.md](../specs/2026-08-30-po-board-exception-saved-views-design.md) (BRD/FRD/TD, incl. Fase 4 team-review — groen, geen resterende blockers)
**Work item:** #AB:297 (child van Feature #130 — D365 Purchase Orders)
**Tags:** purchase-orders; view-tabs; filters; ux

---

## User story

**Als** staff-gebruiker (admin/employee) op het PO-board
**wil ik** 2 tot 4 kolomfilters (bijv. "delivery date is voorbij" ÉN "confirmed is No") in één klein formulier samenstellen en als tab opslaan
**zodat** ik een terugkerende samengestelde inkoopvraag ("late, onbevestigde orders") met één klik kan oproepen, zonder elke keer 2-4 losse kolommenu's na elkaar te openen.

---

## Acceptatiecriteria (definitie van "klaar")

1. In het Tabs-menu van een actieve saved view staat een derde item "Exception filter…", naast de bestaande "Tab" en "Tabs from column…".
2. Opent een dialoog met naamveld en standaard 2 filterrijen (kolom+operator+waarde), met "+ Add condition" tot maximaal 4 rijen.
3. "Create" is uitgeschakeld tot: naam ingevuld, minstens 2 rijen geldig, geen twee rijen dezelfde kolom.
4. Na Create: nieuwe tab verschijnt in de tabbalk, wordt meteen actief, bord toont alleen rijen die aan alle ingevulde rijen tegelijk voldoen (AND).
5. De tab werkt daarna identiek aan elke andere extra tab (opnieuw aanklikken, hover-samenvatting, verwijderen).
6. De tab overleeft "Save as new view" / "Update current view" via de bestaande `view_state_json.tabs.extraTabs` — geen aparte opslag.
7. "Reset view" verwijdert de tab, net als elke andere extra tab.
8. Geen nieuwe SQL-migratie, geen nieuwe API-route, geen nieuw veld op `po_saved_views`.

---

## Wat is al gedaan (geen tasks meer nodig tenzij verificatie)

Nog niets geïmplementeerd — het ontwerp is klaar en heeft de verplichte team-review doorlopen. Tijdens de review is een race condition gevonden en in het ontwerp zelf opgelost: de nieuwe tab zou direct na aanmaken een lege filter-samenvatting tonen (React 18 batching); de fix bouwt `extraFilters` nu synchroon op i.p.v. via een reactieve capture.

_(Leeg tot implementatie start)_

---

## Backlog — tasks

- [ ] `src/utils/exceptionFilterRows.js` + tests; `getOperatorLabels` exporteren uit `PurchaseOrdersActiveFilterEditor.jsx` (geen gedragswijziging, hergebruik i.p.v. een derde lokale kopie).
- [ ] `usePurchaseOrderViewTabs.js`: `addBlankTab(name, extraFilters = {})` backward-compatible uitbreiding + test — lost de auto-capture-race op vóór er UI op gebouwd wordt.
- [ ] `PurchaseOrderExceptionFilterRow.jsx` + test (kolom/operator/waarde-rij, `React.memo`).
- [ ] `PurchaseOrderNewFilterTabDialog.jsx` + test (naam + rijenlijst + Add condition + Create/Cancel).
- [ ] `ViewTabsDialogsProvider.jsx`: `openNewFilterTab`-state/action, `handleNewFilterTab` (bouwt `extraFilters`, roept `addBlankTab(name, extraFilters)` aan).
- [ ] `PurchaseOrderViewTabMenuSection.jsx`: "Exception filter…"-item + test.
- [ ] `PurchaseOrdersPageLayout.jsx`/`PurchaseOrdersPage.jsx`: bestaande + nieuwe props gebundeld tot één `viewTabsProps`-object (15→12 props).
- [ ] Tests: Create-flow incl. expliciete regressietest voor de auto-capture-race (direct na Create, vóór elke tab-wissel); server-round-trip-test (POST/PATCH) van een 4-rijen composer-payload.
- [ ] PATCH in `src/config/version.js`.

## Aantoonbaar

- Tabs-menu → Exception filter… → naam + 2 condities → Create → nieuwe tab actief, bord gefilterd op beide condities tegelijk.
- Direct na Create, vóór elke tab-wissel: hover toont meteen de samenvatting van beide condities (regressiecheck voor de gevonden race).
- Save as new view / Update current view, pagina herladen, view opnieuw toepassen → tab en filters staan er nog.
- Reset view → de tab is verdwenen.
- Supplier op een vendor-scoped view: de tab is zichtbaar/klikbaar, maar "Exception filter…" staat niet in hun (niet-bestaande) Tabs-menu.

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-30-po-board-exception-saved-views-design.md](../specs/2026-08-30-po-board-exception-saved-views-design.md); wijzig dat bestand bij nieuwe afspraken, dit document en het work item volgen.
