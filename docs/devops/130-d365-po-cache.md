# D365 Purchase Orders — SQL-cache + dynamische kolommen (DevOps)

**Doel:** D365 Purchase Order-data in SQL cachen voor een snel scherm, verrijken met door gebruikers gedefinieerde kolommen (hoofd- én regelniveau), en gecontroleerde write-back van geselecteerde D365-velden.
**Referentie in repo:** [docs/plans/dev_d365-po-cache-annotatielaag-plan.md](../plans/dev_d365-po-cache-annotatielaag-plan.md)
**Sluit aan op:** [76-visie-d365-composite-proxy.md](76-visie-d365-composite-proxy.md)
**Work item:** Feature #AB:130 (Vendor-App)
**Tags:** d365; odata; purchase-orders; sql-cache; dynamische-kolommen; write-back

---

## User story

**Als** medewerker die met Purchase Orders werkt
**wil ik** een snel PO-scherm uit een SQL-cache met eigen kolommen en, waar toegestaan, correcties terug naar D365
**zodat** ik vlot kan werken, eigen context kan vastleggen en gecontroleerd D365-velden kan corrigeren.

---

## Acceptatiecriteria (definitie van "klaar")

1. Lezen gaat altijd uit de SQL-cache (`po_cache`); D365 wordt alleen geraadpleegd bij expliciete of lazy refresh (> ~15 min), geen scheduler.
2. Eigen kolommen toevoegen/hernoemen/soft-deleten op hoofd- én regelniveau; waarden instant opgeslagen (EAV, getypeerd).
3. Per-gebruiker nieuw-/gewijzigd-detectie sinds laatste bezoek (rij-highlight).
4. Write-back alleen voor kolommen die admin als `writable_to_d365` markeert, met optimistic concurrency (If-Match/ETag) en audit.
5. OAuth2 client-credentials vervangt het statische bearer-token; minimale D365-rechten.
6. Ontwerp is compatibel met latere per-gebruiker kolomzichtbaarheid (`po_column_visibility`), nu nog niet gebouwd.
7. Tests + OTAP/devops-runbook + versie-bump bij oplevering.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Visie composite-proxy (achtergrond + open vragen) | [docs/devops/76-visie-d365-composite-proxy.md](76-visie-d365-composite-proxy.md) |
| Bestaande D365 OData-client (uit te breiden met OAuth2 + write-back) | [server/services/D365ODataService.js](../../server/services/D365ODataService.js) |
| PO board-UI (monday/QAQC-stijl) — basis | [src/components/supplier/](../../src/components/supplier/) |

---

## Backlog — child User Stories

### Story #AB:131 — Fase 0: Fundament (OAuth2 + $metadata + write-back-mechanisme)
**Beschrijving:** Geverifieerd fundament vóór de bouw. OAuth2 client-credentials vervangt het statische token; echte D365-veldnamen via `$metadata`; per beoogd write-back-veld PATCH vs bound Action bepalen.
**Acceptatiecriteria:**
1. OAuth2 client-credentials met token-cache + refresh vóór expiry; statisch token verwijderd.
2. Definitieve D365-veldnamen vastgelegd o.b.v. `$metadata`.
3. Per beoogd write-back-veld PATCH vs bound Action gedocumenteerd.

### Story #AB:132 — Fase 1: SQL-cache + dynamische eigen kolommen (geen write-back)
**Beschrijving:** `po_cache` + `po_columns` + `po_custom_values` (idempotente migraties), read-endpoint met merge, refresh-knop + lazy refresh, eigen kolommen op beide niveaus.
**Acceptatiecriteria:**
1. Lezen altijd uit SQL-cache; D365 alleen bij refresh.
2. Eigen kolommen toevoegen/hernoemen/soft-deleten op beide niveaus; getypeerd opgeslagen (EAV).
3. Refresh-knop + lazy refresh-drempel werkend; versheidsindicator zichtbaar.

### Story #AB:133 — Fase 2: Nieuw-detectie per gebruiker (delta-refresh + rij-highlight)
**Beschrijving:** `po_sync_state` (per-user `last_viewed_at` + globale `watermark`), delta-refresh op `ModifiedDateTime`, rij-highlight nieuw/gewijzigd.
**Acceptatiecriteria:**
1. Delta-refresh haalt alleen gewijzigde rijen op en werkt de watermark bij.
2. Rij-highlight toont nieuw/gewijzigd per gebruiker sinds `last_viewed_at`.
3. `POST /viewed`-endpoint werkt `last_viewed_at` bij.

### Story #AB:134 — Fase 3: D365 write-back (veldcorrecties terug naar D365)
**Beschrijving:** `po_field_corrections` (audit + status), admin-only write-back-config per kolom, write-through met optimistic concurrency, schrijf-scope in OAuth.
**Acceptatiecriteria:**
1. Alleen kolommen met `writable_to_d365` corrigeerbaar; bewuste actie + bevestiging.
2. Write-through met If-Match/ETag; conflicten geven nette foutmelding, geen overschrijving.
3. Elke correctie geaudit met status `pending`/`applied`/`failed`.

### Story #AB:135 — Fase 4 (later): Per-gebruiker kolomzichtbaarheid
**Beschrijving:** `po_column_visibility` + admin-UI per gebruiker; afwezigheid = standaard zichtbaar. Pas bouwen wanneer personalisatie aan de beurt is.
**Acceptatiecriteria:**
1. Admin kan per gebruiker kolomzichtbaarheid instellen.
2. Read-endpoint filtert kolommen op `po_column_visibility`.
3. Geen regressie voor bestaande gedeelde-kolom-werking.

### Story #AB:136 — Fase 5: Oplevering (tests, OTAP-runbook, versie-bump)
**Beschrijving:** Tests voor services/endpoints, OTAP/devops-runbook, versie-bump in app-footer.
**Acceptatiecriteria:**
1. Tests dekken refresh, merge-read, custom values en write-back-conflict.
2. OTAP/devops-runbook beschrijft uitrol en admin write-back-config.
3. Versie-bump zichtbaar in app-footer.

---

## Versie document

Aangemaakt op basis van [docs/plans/dev_d365-po-cache-annotatielaag-plan.md](../plans/dev_d365-po-cache-annotatielaag-plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/130-d365-po-cache.md
