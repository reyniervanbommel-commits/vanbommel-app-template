# Plaatje-kolom in main tabel (DevOps)

**Doel:** Gebruiker kan in de main PO-tabel een read-only kolomtype `plaatje` toevoegen dat een image-URL opbouwt uit een template met `{xxx}`-placeholder en basistransformaties op een header-bronkolom.
**Referentie in repo:** [.cursor/plans/dev_plaatje_kolom_main_tabel_f36529e6.plan.md](../../.cursor/plans/dev_plaatje_kolom_main_tabel_f36529e6.plan.md)
**Tags:** po-tabel; custom-kolommen; image; csp; security

---

## User story

**Als** gebruiker van de main PO-tabel
**wil ik** via het bestaande headermenu een kolomtype `Plaatje` kunnen toevoegen met een URL-template en een header-bronkolom
**zodat** ik per rij automatisch een afbeelding zie zonder handmatig URL's in te voeren.

---

## Acceptatiecriteria (definitie van "klaar")

1. Externe afbeeldingen laden daadwerkelijk in productie (CSP `img-src` verruimd en geverifieerd) — anders is de feature niet af te leveren.
2. In het bestaande headermenu is `Plaatje` beschikbaar onder `+ Kolom rechts toevoegen`.
3. Gebruiker kan bij toevoegen `urlTemplate` (met `{xxx}`), een **header**-bronkolom en basistransformaties instellen.
4. Nieuwe kolom wordt aangemaakt, juist gepositioneerd en direct hernoembaar zoals de bestaande flow.
5. Afbeelding wordt read-only gerenderd op basis van `{xxx}`-vervanging; de bronwaarde is `encodeURIComponent`-ed.
6. Ongeldige of onveilige configuratie wordt geblokkeerd met een duidelijke foutmelding (alleen `http/https`, verplichte placeholder + bronkolom).
7. SQL-constraints (`po_columns` én `tb_columns`) en backend-validatie ondersteunen `image` zonder regressie op bestaande types.
8. Betrokken componenten blijven onder 300 regels na de split; versienummer is verhoogd.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Add-column menuflow (NEW_COLUMN_TYPES + one-click add) | src/components/supplier/PurchaseOrderColumnFilterMenu.jsx |
| Payload-doorloop options → API | src/hooks/usePurchaseOrdersPage.js (addColumn/addHeaderColumnAfter) |
| Generieke options-JSON-opslag | server/services/PurchaseOrderColumnsService.js |

---

## Backlog — child User Stories

### Story A: CSP-verruiming + backend-validatie + migratie (fundament & security)
**Beschrijving:** Maak `image` end-to-end mogelijk in de datalaag en beveilig het. `helmet()` in server.js zet nu `img-src 'self' data:` en blokkeert externe plaatjes — dit moet eerst verruimd worden (blocker). Daarna backend-datatype + validatie en de DB-constraints.
**Acceptatiecriteria:**
1. CSP `img-src` verruimd (host-whitelist of `https:`, keuze vastgelegd) en geverifieerd dat een externe img laadt.
2. `'image'` toegevoegd aan `DATA_TYPES`; image-specifieke options-validatie: verplichte `urlTemplate` mét `{xxx}`, `sourceColumnKey` naar bestaande header-kolom, transform-whitelist met per-type schema, alleen `http/https`.
3. Idempotente migratie die `CK_po_columns_data_type` én `CK_tb_columns_data_type` DROPT en met `image` opnieuw AANMAAKT (CHECK is niet muteerbaar; DROP achter `IF EXISTS`).

### Story B: Frontend add-flow + config-stap
**Beschrijving:** Voeg het type `Plaatje` en een configuratiestap toe aan het headermenu. Vereist eerst het splitsen van PurchaseOrderColumnFilterMenu (464 regels) en het doorgeven van de kolommenlijst.
**Acceptatiecriteria:**
1. PurchaseOrderColumnFilterMenu gesplitst (<300 regels), add-type pane als eigen component, gedrag 1-op-1 behouden.
2. Nieuwe prop `availableColumns` gethreaded vanuit PurchaseOrdersPage voor de bronkolom-dropdown.
3. Config-stap met `urlTemplate`, header-`sourceColumnKey` en `transforms`, inclusief inline foutmelding-surface; bevestigen roept add-callback aan met `dataType: 'image'` + `options`.

### Story C: Read-only rendering + resolver + filter/sort + tests
**Beschrijving:** Render de plaatjeskolom read-only en zorg dat filter/sort logisch gedrag vertonen. Voeg tests toe en verhoog de appversie.
**Acceptatiecriteria:**
1. Gedeelde resolver-util (`src/utils/`): bronwaarde uit `order.values[sourceColumnKey]`, transformaties, `encodeURIComponent` vóór `{xxx}`-substitutie, lege/onveilige URL → geen `<img>`.
2. Custom-tak in PurchaseOrderHeaderCellContent gesplitst: `dataType === 'image'` rendert read-only `<img>` en omzeilt EditableCell.
3. Filter/sort voor image-kolommen uitgeschakeld/gecontroleerd; tests voor resolver + backend-validatie; appversie in src/config/version.js verhoogd.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_plaatje_kolom_main_tabel_f36529e6.plan.md](../../.cursor/plans/dev_plaatje_kolom_main_tabel_f36529e6.plan.md); wijzig dit bestand bij nieuwe afspraken.

---

Repo-document: docs/devops/178-plaatje-kolom.md
Work item: #178 (children: #179, #180, #181)
