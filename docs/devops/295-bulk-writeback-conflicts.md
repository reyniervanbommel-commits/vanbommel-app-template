# Bulk write-back: per-rij uitkomst en retry bij mislukte rijen (DevOps)

**Doel:** Bulk-edit op een D365-writable kolom loopt na een fout door tot alle geselecteerde rijen zijn geprobeerd, toont per mislukte rij de D365-foutmelding, en biedt losse en gezamenlijke retry — in plaats van te stoppen bij de eerste fout met alleen een samengevatte "not attempted"-teller.
**Referentie in repo:** [docs/specs/2026-08-30-bulk-writeback-conflicts-design.md](../specs/2026-08-30-bulk-writeback-conflicts-design.md) (BRD/FRD/TD, incl. Fase 4 team-review — groen, geen resterende blockers)
**Work item:** #AB:295 (child van Feature #130 — D365 Purchase Orders)
**Tags:** d365; write-back; bulk-edit; purchase-orders

---

## User story

**Als** staff (admin of employee) die bulk-edit gebruikt op een D365-writable kolom
**wil ik** na een bulk-wijziging per geselecteerde rij zien of de write-back naar D365 is gelukt of mislukt (met de foutmelding), en mislukte rijen los of allemaal tegelijk opnieuw kunnen proberen
**zodat** ik niet handmatig rij voor rij hoef te zoeken welke van de N gewijzigde rijen zijn mislukt, en ze direct kan herstellen zonder de hele bulk-actie te herhalen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Bulk-edit op een D365-writable kolom (`write_mechanism = 'patch'`) loopt door alle geselecteerde zichtbare rijen heen, ook na een fout op een tussenliggende rij — geen "not attempted"-rijen meer voor dit pad.
2. Na afloop, bij 1 of meer mislukte rijen: de summary-dialoog toont per mislukte rij het PO-nummer en de foutmelding (Engels), met een Retry-knop per rij.
3. Een "Retry all failed"-knop probeert alle nog-mislukte rijen opnieuw, sequentieel.
4. Een rij die bij retry slaagt, verdwijnt uit de mislukte-lijst; de teller wordt bijgewerkt.
5. Een D365-validatiefout of vergrendeld record toont de echte D365-foutdetail, niet langer een generieke tekst.
6. Bulk-edit zonder enige mislukking gedraagt zich ongewijzigd (dialoog sluit stil).
7. Bulk op een niet-D365 kolom gedraagt zich ongewijzigd (stop-on-first-error, bestaande samenvattingstekst).
8. Alle nieuwe/gewijzigde UI-teksten zijn Engels.

---

## Wat is al gedaan (geen tasks meer nodig tenzij verificatie)

Nog niets geïmplementeerd — het ontwerp (BRD/FRD/TD) is klaar en heeft de verplichte team-review doorlopen (Dev Lead, React Architect, Backend Engineer, Security Engineer, Refactor Specialist — alle 6 gevonden blockers zijn in het ontwerp zelf opgelost, o.a. een risico op onterechte staff-sign-out bij een D365-token-401 tijdens een retry-batch, en een generieke-errorHandler-val die de nieuwe foutdetails in productie zou verbergen).

_(Leeg tot implementatie start)_

---

## Backlog — tasks

- [ ] Backend: statuswhitelist (`{400,404,409,422,423}`) + `summarizeODataFailure` inzetten in `writeBackField`'s PATCH-failure-branch + tests (incl. "401 blijft 502, niet 401"). `POST /:tableKey/correct` krijgt een eigen `err.status`/`err.message`-interceptie vóór `next(err)` + test tegen productie-`errorHandler`.
- [ ] `src/hooks/purchaseOrderBulkEditRun.js` (canonieke `valuesEqual` + `runCorrectRows`) + tests.
- [ ] `usePurchaseOrderBulkEdit.js`: nieuwe `runBulkUpdateCorrect` + reject-bij-eigen-rij-faalt-logica + tests (bestaande save-pad-tests blijven groen).
- [ ] Nieuwe hook `src/hooks/usePurchaseOrderBulkEditRetry.js` + tests (`retryRow`/`retryAllFailed`/`retryingBulk`, stabiele-referentie-tests).
- [ ] `PurchaseOrdersPageDialogs.jsx` → `dialogState`/`dialogActions`-props (2 i.p.v. 11 losse props).
- [ ] Nieuw `PurchaseOrderBulkEditFailedRows.jsx` + korte aansluiting in `PurchaseOrderBulkEditDialog.jsx`.
- [ ] PATCH in `src/config/version.js`.

## Aantoonbaar

- 3 geselecteerde rijen, rij 2 faalt (D365-conflict): rij 1 en rij 3 worden alsnog bijgewerkt (voorheen bleef rij 3 "not attempted").
- Summary-dialoog toont de echte D365-foutmelding voor een niet-409/404-fout, ook in een lokale simulatie van PROD (`isProductionApp()` true).
- Retry op een opgeloste rij → rij verdwijnt uit de lijst; "Retry all failed" op meerdere rijen werkt sequentieel.
- Gesimuleerde D365-token-401 tijdens een PATCH → de staff-gebruiker wordt niet uitgelogd.
- `mode === 'save'` (niet-D365 kolom) blijft ongewijzigd: stop-on-first-error.

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-30-bulk-writeback-conflicts-design.md](../specs/2026-08-30-bulk-writeback-conflicts-design.md); wijzig dat bestand bij nieuwe afspraken, dit document en het work item volgen.
