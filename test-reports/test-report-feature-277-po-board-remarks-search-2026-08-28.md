# Testrapport: Feature 277 PO-board remarks search

**Datum**: 2026-08-28
**Tester**: Cursor Agent
**App URL**: https://preview-po-board-remarks-sea.graysand-65442c41.northeurope.azurecontainerapps.io
**App versie**: v1.52.17
**Geteste wijzigingen**: Remarks-kolom `contains`-zoeken over alle actieve remarks; intersectie met board-rijen

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | PASS | Remarks-menu: contains, hint, Apply/Clear; geen sort/color |
| Interactie | PASS | Lege zoekterm, hit `2e`, 1-teken geblokkeerd, Clear herstelt |
| Console | PASS | 0 errors na login en filter |
| Netwerk | PASS | `GET .../remarks/search` 200; geen call bij 1 teken |

**Totaal resultaat**: PASS

---

## Geteste scenario's

### Scenario 1: Login en board

**Stappen**:
1. Preview geopend, ingelogd
2. Gewacht tot PO-board geladen was

**Verwacht resultaat**: Versie v1.52.17, board met Remarks-kolom
**Werkelijk resultaat**: Footer `Version v1.52.17`; Remarks-kolom aanwezig
**Status**: PASS

### Scenario 2: Remarks-menu (contains only)

**Stappen**:
1. Remarks-kolommenu geopend
2. Gecontroleerd op sort/color/hint

**Verwacht resultaat**: Alleen contains; hint bij &lt;2 tekens; geen unique picker
**Werkelijk resultaat**: Operator `contains`, hint `Enter at least 2 characters`, geen Sort A to Z, geen Color
**Status**: PASS

### Scenario 3: Zoekterm zonder hits (`delay`)

**Stappen**:
1. Filterwaarde `delay` → Apply
2. Response bekeken

**Verwacht resultaat**: 200, lege keys, lege tabel (fail-closed)
**Werkelijk resultaat**: `{ keys: [] }`, `0 in view of 2811 total`; search 107 ms, SQL 25 ms
**Status**: PASS

### Scenario 4: Zoekterm uit echte remark (`2e`)

**Stappen**:
1. Remark-thread WSPO-0071259 geopend (teksten `1e` / `2e`)
2. Filter `2e` Apply

**Verwacht resultaat**: Rijen met die remark, AND met tabfilter
**Werkelijk resultaat**: API 4 keys; UI `2 in view of 2811 total` (tab had 217 rijen). Search 48 ms, SQL 3 ms
**Status**: PASS

### Scenario 5: Te korte term

**Stappen**:
1. Filterwaarde `x` → Apply

**Verwacht resultaat**: Hint blijft; geen search-request
**Werkelijk resultaat**: Hint zichtbaar; geen `/remarks/search` binnen 2,5 s
**Status**: PASS

### Scenario 6: Clear

**Stappen**:
1. Clear in remarks-menu

**Verwacht resultaat**: Tabfilter terug (217 in view)
**Werkelijk resultaat**: `217 in view of 2811 total`
**Status**: PASS

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Remarks-kolom | Ja | Ja | Menu-trigger aanwezig |
| contains-operator | Ja | Ja | Enige operator |
| Hint 2 tekens | Ja | Ja | Engels |
| Apply / Clear | Ja | Ja | Primary Apply links |
| Footer versie | Ja | Ja | v1.52.17 |

**Screenshots**: MCP `playwright/screenshots/ui-review-*.png` (niet in worktree gekopieerd — MCP-root beperkt)

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 0 | na login/filter |
| Warnings | 0 | |

Bootstrap-testaccount op preview: 401 (verwacht). DEV-account: 200.

---

## Netwerk requests

| Endpoint | Methode | Status | Opmerking |
|----------|---------|--------|-----------|
| `/api/auth/login` | POST | 200 | DEV-account |
| `/api/data/purchase-orders` | GET | 200 | koude load ~36 s |
| `/api/data/purchase-orders/remarks/summary` | GET | 200 | bestaand |
| `/api/data/purchase-orders/remarks/search?q=delay` | GET | 200 | 0 keys |
| `/api/data/purchase-orders/remarks/search?q=2e` | GET | 200 | 4 keys, geen bodies |

---

## Beperkingen

- Playwright-click op Remarks-trigger werd onderschept door sticky kolommen; menu via scroll + mouse-click
- Eerste Apply via generieke knop “Apply” opende even een tab-dialog; daarna gecanceld — remarks-search was al afgevuurd
- Responsive 375 px: board blijft desktop-tabel met horizontale scroll
