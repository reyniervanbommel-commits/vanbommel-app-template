# RCCP-grafiek: PO-vakjes, received onder de as, Today en te laat (DevOps)

**Work item:** [Feature #269](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/269)  
**Doel:** In de bestaande Capacity vs load-grafiek per week PO-vakjes tonen, received onder de x-as op ontvangstdatum, een Today-lijn op de echte datum, en een rood kader om te late open orders.  
**Referentie in repo:** [docs/specs/2026-08-24-rccp-chart-po-segments-design.md](../specs/2026-08-24-rccp-chart-po-segments-design.md)  
**Tags:** rccp; chart; po-segments

---

## User story

**Als** planner (employee/admin; leverancier ziet hetzelfde voor eigen vendor)  
**wil ik** in de bestaande grafiek *Capacity vs load* per week zien welke PO’s de last maken, wat al received is, waar vandaag valt, en welke open orders te laat zijn  
**zodat** ik load niet als één anonieme som hoef te lezen en achterstallige open PO’s meteen herken.

---

## Acceptatiecriteria (definitie van “klaar”)

1. Received (configured Delivered quantity) staat boven als lichte vakjes op de bestaande RCCP-datum (geplande week) én onder de x-as als vakjes op de ontvangstdatum.
2. Admin kan in RCCP settings een optioneel veld **Receipt date** kiezen; lege/ontbrekende datum → onder de as op de geplande week.
3. Open quantity staat boven als donkere vakjes op de geplande week; één vak per PO per week per status; PO alleen via tooltip (Engels), geen klik op vakjes.
4. Balkbreedte 80% van de weekkolom.
5. Today-lijn is een SVG-overlay op de echte weekdag in de huidige ISO-weekkolom (geen Recharts `ReferenceLine` op band-midden); huidige ISO-week buiten het venster → geen lijn.
6. Rood kader alleen om open-vakjes waarvan de geplande ISO-week strikt vóór de huidige ISO-week ligt.
7. Geen nieuwe route of SQL-migratie; bestaande `GET /api/rccp/analysis` + RCCP-config JSON; matrix/KPI’s/drill-down ongewijzigd.
8. `APP_VERSION` patch; tests voor segmenten, late, fallback-datum, vendorfilter; handmatig te controleren op `/rccp`.

---

## Wat is al gedaan

| Item | Locatie |
|------|---------|
| Capacity vs load-grafiek | `src/components/rccp/RccpChartMatrixPanel.jsx` |
| Analysis + weektotalen | `server/services/RccpAnalysisService.js` |
| Chart roles open/delivered | `server/services/RccpSettingsService.js` |
| Received onder de as (weektotalen, negatief) | `buildChartSeries` |
| Ontwerp (BRD/FRD/TD) | `docs/specs/2026-08-24-rccp-chart-po-segments-design.md` |

---

## Backlog — child User Stories

### Story A: Receipt date in RCCP-settings
**Beschrijving:** Optioneel veld `receiptDateColumnKey` in RCCP-config en UI **Receipt date** naast Delivery date.  
**Acceptatiecriteria:**
1. Admin kan een datumkolom kiezen of leeg laten; validatie trim, max 128, `[A-Za-z0-9_]+`.
2. Employee/supplier zien de grafiek; alleen admin wijzigt settings.
3. Tests in `RccpSettingsService.test.js`.

### Story B: PO-segmenten in analysis-payload
**Beschrijving:** `GET /api/rccp/analysis` levert `segmentsAbove` / `segmentsBelow` uit dezelfde PO-snapshot.  
**Acceptatiecriteria:**
1. Pure `buildPoSegments` in `server/utils/rccpPoSegments.js`; `now` geïnjecteerd; zelfde vendorfilter als de matrix.
2. Received-onder op ontvangstweek (fallback geplande week); late alleen open vóór huidige ISO-week.
3. Tests: stapel, late, fallback, clip, vendorfilter.

### Story C: Grafiek — stack-bars, Today, te-laat-kader
**Beschrijving:** Custom Recharts-shape, tooltip, Today-overlay, rode stroke.  
**Acceptatiecriteria:**
1. Module-level `shape={RccpPoStackBarAbove|Below}`; geen Fluent Tooltip in een lijst; balk 80% weekbreedte.
2. Today via `todayLineX` SVG in het panel; geen `ReferenceLine` voor Today.
3. `RccpChartMatrixPanel` onder 300 regels; `APP_VERSION` patch.

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-24-rccp-chart-po-segments-design.md](../specs/2026-08-24-rccp-chart-po-segments-design.md); wijzig dat bestand bij nieuwe afspraken.

Repo-document: `docs/devops/269-rccp-chart-po-segments.md`
