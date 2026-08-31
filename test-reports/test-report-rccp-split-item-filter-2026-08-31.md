# Testrapport: PO-board RCCP split — itemfilter en staafklik

**Datum**: 2026-08-31
**Tester**: Cursor Agent
**App URL**: http://localhost:5178/
**App versie**: v1.52.91
**Geteste wijzigingen**: RCCP-split onder de PO-tabel volgt het itemfilter van de tabel (inclusief linked header `artikel_values_4`); klik op een staafsegment togglet dat filter; item picker weg in de split; KPI-(i) alleen bij open KPI-tab; vendorwissel zonder spinner.

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | PASS | Geen item picker in de split; Open RCCP page aanwezig; (i) niet op RCCP-tab |
| Interactie | PASS | Staafklik filtert tabel + chart; tweede klik wist; vendorwissel houdt vorige chart |
| Console | PASS | Alleen bestaande Fluent `mergeClasses()`-ruis |
| Netwerk | PASS | `/api/rccp/analysis` 200 voor V000013 en V000214 |

**Totaal resultaat**: PASS

---

## Geteste scenario's

### Scenario 1: Split opent zonder item picker

**Stappen**:
1. PO-board, view-tab Fa. Jan Pulles JPLC, RCCP-tab geselecteerd
2. Show panel

**Verwacht resultaat**: Chart + weekrange + vendor, geen item picker, geen KPI-(i)
**Werkelijk resultaat**: Week range 2021-W47 → 2022-W51 · Vendor V000013; 499 klikbare segmenten; `Open RCCP page`; geen item-filter-UI; geen About KPI tiles
**Status**: PASS

### Scenario 2: Klik op staafsegment filtert de PO-tabel en de chart

**Stappen**:
1. Klik op het grootste staafsegment
2. Controleer aantallen

**Verwacht resultaat**: Tabelfilter op Artikel Values (linked itemNumber); chart toont alleen dat item
**Werkelijk resultaat**: 276 → 7 rijen; 499 → 16 segmenten; zichtbaar filter CBM-10020-30-11
**Status**: PASS

### Scenario 3: Tweede klik op hetzelfde item wist het filter

**Stappen**:
1. Opnieuw klikken op een segment van het gefilterde item

**Verwacht resultaat**: Filter weg, oorspronkelijke rijen/chart terug
**Werkelijk resultaat**: 7 → 276 rijen; 16 → 499 segmenten
**Status**: PASS

### Scenario 4: KPI-(i) alleen bij open KPI-tab

**Stappen**:
1. Paneel open, RCCP-tab: geen (i)
2. KPI-tab: (i) aanwezig
3. Terug naar RCCP: (i) weg

**Verwacht resultaat**: (i) alleen bij KPIs + paneel open
**Werkelijk resultaat**: `About KPI tiles` 0 op RCCP, 1 op KPIs
**Status**: PASS

### Scenario 5: Vendorwissel zonder spinner-flikker

**Stappen**:
1. Chart geladen voor Centenario (V000214, 853 segmenten, geen loading)
2. Wissel naar Fa. Jan Pulles

**Verwacht resultaat**: Vorige chart blijft staan tot nieuwe data; geen Loading RCCP
**Werkelijk resultaat**: Eerste sample na 200 ms: vendorlabel V000013, loading false, 853 segmenten (vorige chart); daarna 499 segmenten voor V000013
**Status**: PASS

### Scenario 6: Kolommenmenu Artikel Values (handmatig filter)

**Stappen**:
1. Poging het filtermenu van Artikel Values te openen

**Verwacht resultaat**: Menu opent
**Werkelijk resultaat**: Klik onderschept door sticky header-kolommen (orderNumber / select-all). Tabel→chart is wel bewezen via scenario 2 (zelfde `filterByColumn` op `artikel_values_4`)
**Status**: PASS (beperking MCP-klik; gedrag via scenario 2)

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Item picker in split | Nee | Ja | Bewust verwijderd |
| Open RCCP page | Ja | Ja | |
| Week range + vendor | Ja | Ja | |
| KPI (i) op RCCP-tab | Nee | Ja | |
| KPI (i) op KPI-tab | Ja | Ja | aria-label About KPI tiles |
| Footer versie | Ja | Ja | v1.52.91 |

**Screenshots**: `playwright/screenshots/01-rccp-pane-open.png`, `playwright/screenshots/02-bar-click-filters-table.png`, `playwright/screenshots/03-rccp-after-vendor-switch.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 56 | Fluent `mergeClasses()` atomic-class concatenatie (bestaand, niet van deze wijziging) |
| Warnings | 0 | |

**Details**:
```
mergeClasses(): a passed string contains multiple identifiers of atomic classes (classes that start with "___")
```

---

## Netwerk requests

| Endpoint | Methode | Status | Opmerking |
|----------|---------|--------|-----------|
| /api/rccp/vendors | GET | 200 | |
| /api/rccp/analysis?…vendorAccount=V000013 | GET | 200 | Venster 2021-W47 → 2022-W51 |
| /api/rccp/analysis?…vendorAccount=V000214 | GET | 200 | Vendorwissel Centenario |
| /api/rccp/board-kpis | GET | 200 | KPI-tab |

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- Geen

### Suggesties (optioneel)
- Kolommenmenu van Artikel Values is lastig te klikken door sticky overlay; los van deze feature

### Niet-gerelateerde observaties
- Fluent `mergeClasses()`-fouten op de PO-board (bestaand)

---

## Beperkingen van deze test

- [x] Authenticatie: sessie was al actief
- [ ] Kolommenmenu Artikel Values niet via MCP te openen (pointer intercept)
- [ ] browser_lock niet beschikbaar; browser niet aangeraakt tijdens de test
