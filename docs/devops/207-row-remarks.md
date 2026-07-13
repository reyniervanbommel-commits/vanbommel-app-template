# Row remarks en volledige rijactiviteit op het Purchase Orders board (DevOps)

**Doel:** Medewerkers kunnen per purchase-orderrij opmerkingen uitwisselen en in hetzelfde zijpaneel alle relevante rijwijzigingen terugzien, zodat overleg en auditinformatie centraal bij de order beschikbaar zijn.  
**Referentie in repo:** [`.cursor/plans/dev_2026-07-13-row-remarks.plan.md`](../../.cursor/plans/dev_2026-07-13-row-remarks.plan.md)  
**Azure DevOps Feature:** [#207](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/207)  
**Tags:** remarks; purchase-orders; activity-feed; fluent-ui; sql; audit

---

## User story

**Als** medewerker die purchase orders beoordeelt  
**wil ik** opmerkingen, reacties en volledige wijzigingsgeschiedenis per orderrij kunnen bekijken en toevoegen  
**zodat** de context, opvolging en audittrail centraal en direct bij de juiste order beschikbaar zijn.

---

## Acceptatiecriteria (definitie van klaar)

1. Iedere PO-headerrij toont een remarkballon met het actuele aantal niet-verwijderde remarks.
2. Ballon, Remarks-cel en celcontextmenu openen hetzelfde toegankelijke Fluent UI OverlayDrawer-panel voor de juiste order.
3. Het panel bevat Remarks, History en All met tellers, fout-/leegstates en stabiele cursorpaginering.
4. History bevat D365-refreshwijzigingen, custom-celledits, write-backstatus en rijacties zonder dubbele USER-ledgeritems.
5. Remarks worden server-side gevalideerd en als platte tekst met serverauteur en -tijd weergegeven.
6. Emoji-reacties zijn keyboardtoegankelijk, atomair en idempotent; reageren op een eigen remark wordt geweigerd.
7. Employees verwijderen alleen eigen remarks; admins mogen alle verwijderen; cross-table en cross-row mutaties worden geweigerd.
8. Er bestaat precies één read-only Remarks-masterkolom; niet-ondersteunde kolomacties en directe custom-valuewrites zijn geblokkeerd.
9. Polling haalt uitsluitend delta's op in een zichtbaar, geopend panel en ruimt requests en timers correct op.
10. Gewijzigde componenten blijven binnen de projectlimieten en netwerklogica blijft in feature-hooks en services.
11. Migratie 023 is idempotent, non-destructief en wordt via OTAP op DEV en PROD uitgevoerd.
12. Unit-, component-, build- en preview-browsertests slagen; versie en DEV-testitem zijn bijgewerkt.

---

## Wat is al gedaan

| Bestaande basis | Locatie |
|---|---|
| Per-cel historie-API | `server/services/TableDataService.js`, `server/routes/data.js` |
| Custom-cel audit | `dbo.tb_cell_history` |
| D365 write-back audit | `dbo.tb_field_corrections` |
| Centrale change-ledger | `dbo.tb_change_ledger` |
| History-UI | `src/components/supplier/CellHistoryPopover.jsx` |
| API-client en timing | `src/utils/api.js`, `server/utils/timing.js` |

---

## Backlog — child User Stories

### #208 — Board-hotspots veilig splitsen voor remarks-integratie

Splits de bestaande board-hotspots, introduceer één gedeeld celcontextmenu en behoud filter-, clear- en copygedrag. Alle gewijzigde componenten blijven onder 300 regels en krijgen maximaal 10 props.

### #209 — Remarks-datamodel, singletonkolom en beveiligde API

Voeg migratie 023, de singleton Remarks-masterkolom, remarksopslag, soft delete, summary en atomische emoji-reacties toe met volledige validatie, ownership en IDOR-bescherming.

### #210 — Volledige rijgeschiedenis en gecombineerde activity-feed

Combineer D365-refreshmutaties, custom-celledits, write-backstatus, rijacties en remarks in een gededupliceerde, cursor-gepagineerde activity-feed.

### #211 — Toegankelijk remarks- en activiteitspanel

Bouw het OverlayDrawer-panel met Remarks, History en All, toegankelijke reacties, foutstates, dagscheidingen, cursorpaginering en begrensde delta-polling.

### #212 — Remarks integreren in het Purchase Orders board en valideren

Integreer ballon, contextmenu, Remarks-kolom, row-summary en drawer. Rond versiebeheer, DEV-testchecklist, migratie en preview-browsertest af.

---

## Volgorde en afhankelijkheden

1. #208 — veilige refactor.
2. #209 — schema en remarks-API.
3. #210 — volledige activity-service.
4. #211 — drawer en frontend-hooks.
5. #212 — boardintegratie en validatie.

De volledige API-contracten, SQL-constraints, UI-details, testmatrix en performance-eisen staan in het implementatieplan.

---

## Versie document

Aangemaakt op basis van [`.cursor/plans/dev_2026-07-13-row-remarks.plan.md`](../../.cursor/plans/dev_2026-07-13-row-remarks.plan.md). Wijzig het planbestand bij nieuwe afspraken.

