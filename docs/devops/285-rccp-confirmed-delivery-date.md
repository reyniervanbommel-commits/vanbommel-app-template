# RCCP: bevestigde leverdatum fabrikant (DevOps)

**Work item:** [Feature #285](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/285)  
**Doel:** Naast gevraagde leverdatum en ontvangstdatum de door de fabrikant bevestigde leverdatum tonen in RCCP-grafiek, matrix en KPI’s, met één Planning-date-keuze voor KPI’s en overcapacity.  
**Referentie in repo:** [docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md](../specs/2026-08-27-rccp-confirmed-delivery-date-design.md)  
**Tags:** rccp; chart; confirmed-delivery; kpis

---

## User story

**Als** planner (employee/admin; leverancier ziet hetzelfde voor de eigen vendor)  
**wil ik** naast gevraagde leverdatum en ontvangstdatum de door de fabrikant bevestigde leverdatum zien in grafiek, matrix en KPI’s, met een bewuste keuze welke van de twee datums de planning stuurt  
**zodat** ik belofte, plan en ontvangst kan vergelijken en overcapacity/KPI’s op de datum kan rekenen die nu leidend is.

---

## Acceptatiecriteria (definitie van “klaar”)

1. Admin kiest in RCCP Settings een optionele kolom **Confirmed delivery date** (zelfde validatie als Receipt date).
2. Grafiek toont altijd drie encodings: gepland (stack links boven de as), bevestigd (gestreepte balk rechts boven de as, alleen open qty), ontvangen (onder de as).
3. Received: kleur per uniek itemnummer, 25% opacity boven de as, 100% onder de as. Open-vakjes blijven Open-measurekleur + te-laat rood kader.
4. Planning date RadioGroup (Requested | Confirmed, default Requested) stuurt RCCP-KPI’s en overcapacity; extra matrixrij **Confirmed delivery** blijft altijd zichtbaar en telt niet mee in overload zolang Requested gekozen is. Grafiekbalken schuiven niet mee.
5. Vensterlidmaatschap van KPI-regels blijft de gevraagde leverdatum, ook bij Planning date = Confirmed.
6. Per item: huidige celwaarde standaard; versies uit celhistorie; Show all versions alleen voor dat item. Gekozen versie herbuckett alle open qty van dat item naar die week. Lege cel of 1-1-1900 → geen gestreepte balk en geen extra-rij-qty.
7. Klik opent de pin-kaart; hoverkaart blijft niet-interactief. Item-kiezer bovenaan filtert én pint.
8. Month-view somt `segmentsConfirmed` net als above/below.
9. Geen nieuwe SQL-tabel; `GET /api/rccp/board-kpis` ongewijzigd; UI Engels; `APP_VERSION` patch.

---

## Wat is al gedaan

| Item | Locatie |
|------|---------|
| Capacity vs load + PO-segmenten | `src/components/rccp/RccpChartMatrixPanel.jsx`, `server/utils/rccpPoSegments.js` |
| Delivery date + Receipt date settings | `RccpSettingsService.js`, `RccpSettingsDataFields.jsx` |
| KPI-kaarten op gevraagde datum | `server/utils/rccpKpis.js` |
| Celhistorie | `tb_cell_history` / `tb_field_corrections` |
| Ontwerp (BRD/FRD/TD) | `docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md` |

---

## Backlog — child User Stories

### Story A: Confirmed delivery date in RCCP-settings
**Work item:** [#286](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/286)  
**Beschrijving:** Optioneel veld `confirmedDateColumnKey` in RCCP-config en UI **Confirmed delivery date** naast Receipt date.  
**Acceptatiecriteria:**
1. Admin kan een datumkolom kiezen of leeg laten; validatie gelijk aan Receipt date (trim, max 128, `[A-Za-z0-9_]+` als niet-leeg).
2. Lege kolom: geen gestreepte balk, geen extra rij, Planning date verborgen.
3. Tests in `RccpSettingsService.test.js`.

### Story B: Confirmed-segmenten en extra matrixrij
**Work item:** [#287](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/287)  
**Beschrijving:** Analysis levert `segmentsConfirmed` en synthetische rij `__confirmed_delivery__` (open qty in confirmed-week).  
**Acceptatiecriteria:**
1. Pure `rccpPoSegments` + `rccpConfirmedLoad`; sentinel/`1-1-1900` skip; clip buiten venster; header-only open qty via `collectDateSlots`.
2. Extra rij `showInChart: false`; `buildChartSeries` / `buildRccpCapacityKpis` sluiten `isConfirmedDelivery` uit (geen dubbele load).
3. Month-view somt `segmentsConfirmed`. Drill-down op de synthetische rij gebruikt confirmed-week.
4. Tests: clip, sentinel, header-only, geen dubbeltelling.

### Story C: Grafiek — itemkleur, hatching, slot-layout
**Work item:** [#288](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/288)  
**Beschrijving:** Received per itemkleur 25%/100%; confirmed-balk rechts met diagonale hatching; eerst splitsen.  
**Acceptatiecriteria:**
1. Eerst extract: `RccpPlanningDateSwitch`, `rccpChartStacks.js`, `RccpPoConfirmedBar`, `RccpPoSegmentPinCard`; `weekBarBox(..., slot)`.
2. Twee balken boven de as (links gevraagd, rechts confirmed, samen ~80%); onder de as één gecentreerde received-balk.
3. Open blijft measurekleur + te-laat rood kader; palet zonder `#D13438` en zonder Open-measurekleur.
4. Hover highlight koppelt received-above, received-below en confirmed van hetzelfde item. Legenda: Open / Received 25% / Confirmed hatch.
5. `APP_VERSION` patch; panel blijft ≤10 props en onder 300 regels.

### Story D: Planning date — KPI’s en overcapacity
**Work item:** [#289](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/289)  
**Beschrijving:** RadioGroup Requested | Confirmed (default Requested, per gebruiker in board-settings) stuurt RCCP-KPI’s en overcapacity.  
**Acceptatiecriteria:**
1. Query `planningDate` op `GET /api/rccp/analysis`; leeg → requested; ongeldig of confirmed zonder kolom → 400. Niet op `/board-kpis`.
2. KPI-vergelijkingsdatum wisselt; vensterlidmaatschap blijft gevraagde datum. Extra rij blijft zichtbaar; overcapacity volgt de keuze.
3. Prefetch-cachekey en `buildAnalysisQuery` bevatten `planningDate`. Blob-replace stuurt alle bestaande velden mee.
4. Grafiekbalken schuiven niet mee.

### Story E: History-pin per item
**Work item:** [#290](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/290)  
**Beschrijving:** Klik pint het item; `GET /api/rccp/confirmed-history` batched; versie kiezen verschuift de gestreepte balk.  
**Acceptatiecriteria:**
1. Pin-kaart los van hoverkaart. Unpin: All items, klik buiten, Escape. Item-kiezer filtert én pint.
2. `itemNumber`: trim, max 128, reject leeg/`*`/`%`/`_`, exacte match. Vendor verplicht. Geen N× board-history vanuit de client.
3. Versielijst = unieke datums over open regels van het item. Gekozen versie → alle open qty van dat item in die week. Show all versions → qty per datum van regels die die datum kennen.
4. Payload alleen `{ itemNumber, versions: [{ at, date }] }`. `time('rccp_confirmed_hist')`.

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-27-rccp-confirmed-delivery-date-design.md](../specs/2026-08-27-rccp-confirmed-delivery-date-design.md); wijzig dat bestand bij nieuwe afspraken.

Repo-document: `docs/devops/285-rccp-confirmed-delivery-date.md`
