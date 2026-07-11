# Testrapport: Conditional formatting (column header menu)

**Datum**: 2026-07-11
**Tester**: Cursor Agent
**App URL**: http://localhost:5178
**App versie**: v1.14.55
**Geteste wijzigingen**: conditional formatting via column header menu (header + line columns)

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel (E2E) | FAIL | Login/backend niet beschikbaar |
| Interactie (E2E) | FAIL | Board-flow niet uitvoerbaar |
| Component (Vitest) | PASS | PurchaseOrderColumnFilterMenu.test.jsx (4 tests) |
| Console | FAIL | 3 errors |
| Netwerk | FAIL | 3 API calls vastgelegd |

**Totaal resultaat**: PARTIAL (component tests PASS, E2E geblokkeerd)

---

## Geteste scenario's

### Scenario 1: Kolommenu toont Conditional formatting

**Stappen**:
1. Render PurchaseOrderColumnFilterMenu in Vitest met onSetColumnFormatRules
2. Open menu via data-column-menu-trigger

**Verwacht resultaat**: Menu-item "Conditional formatting" zichtbaar
**Werkelijk resultaat**: PASS in component test
**Status**: PASS

### Scenario 2: Submenu regels + Apply

**Stappen**:
1. Open Conditional formatting submenu
2. Klik "+ Add rule" en Apply

**Verwacht resultaat**: onSetColumnFormatRules aangeroepen met column key
**Werkelijk resultaat**: PASS in component test
**Status**: PASS

### Scenario 3: E2E op purchase orders board

**Stappen**:
1. Navigate naar http://localhost:5178
2. Login en open kolommenu op board

**Verwacht resultaat**: Volledige flow op live board
**Werkelijk resultaat**: Geblokkeerd — backend (3008) en SQL niet actief in cloud VM
**Status**: BLOCKED

---

## Console output

| Type | Aantal |
|------|--------|
| Errors | 3 |
| Warnings | 0 |

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

---

## Netwerk requests

| Endpoint | Methode | Status |
|----------|---------|--------|
| /api/auth/me | GET | 500 |
| /api/auth/me | GET | 500 |
| /api/auth/login | POST | 500 |

---

## Bevindingen

- App redirected to login; backend/SQL not available in cloud VM for full board test.
- Login API unavailable (backend down); conditional formatting board flow not reachable.
- Browser MCP (cursor-ide-browser) niet beschikbaar; Playwright headless als vervanger gebruikt.

## Beperkingen

- [x] Authenticatie: login vereist backend + SQL (niet beschikbaar)
- [x] E2E board-flow: geblokkeerd door ontbrekende backend
- [x] Component interactietests: PASS

**Screenshots**: playwright/screenshots/01-login-or-home.png
