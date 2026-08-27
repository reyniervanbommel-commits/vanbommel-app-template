# Testrapport: PO view tabs

**Datum**: 2026-08-27
**Tester**: Cursor Agent
**App URL**: https://preview-po-table-view-tabs-46ae.graysand-65442c41.northeurope.azurecontainerapps.io
**App versie**: v1.52.9 (footer in code; niet gezien in browser)
**Geteste wijzigingen**: saved-view tabs, hover card, dialogs, kolomacties, `final-check-feature` skill

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | SKIPPED | Preview AUTH_BLOCKED |
| Interactie | SKIPPED | Preview AUTH_BLOCKED |
| Console | PASS | Geen JS-errors buiten login-401 |
| Netwerk | FAIL (env) | POST `/api/auth/login` → 401 |
| Unit tests | PASS | viewTabs + gerelateerde tests groen |

**Totaal resultaat**: PASS met beperking (gedrag via tests; browser-E2E niet mogelijk)

---

## Geteste scenario's

### Scenario 1: Preview inloggen en board openen

**Stappen**:
1. Preview-URL geopend
2. Login `admin@example.com` / `Bootstrap123!` en `admin@vanbommel.nl` / `Bootstrap123!`

**Verwacht resultaat**: sessie + PO-board
**Werkelijk resultaat**: "Email address or password is incorrect"; API 401
**Status**: FAIL (omgeving, geen feature-code)

### Scenario 2: Tab-dialogs blijven buiten Menu (unit)

**Stappen**:
1. `PurchaseOrderViewTabMenuSection` test: New tab-dialog blijft open na sluiten view-menu
2. Create-tabs-dialog waarschuwt bij >10 tabs

**Verwacht resultaat**: dialog blijft; waarschuwing zichtbaar
**Werkelijk resultaat**: tests groen
**Status**: PASS

### Scenario 3: Hover card copy (unit)

**Stappen**:
1. `PurchaseOrderViewTabHoverCard` tests

**Verwacht resultaat**: Engelse hover-rijen, geen Fluent Tooltip
**Werkelijk resultaat**: tests groen
**Status**: PASS

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Login Sign in | Ja | Ja | Engels, Fluent card |
| Tab bar | Nee | — | niet bereikt |
| Hover card | Nee | — | niet bereikt |

**Screenshots**: `playwright/screenshots/auth-blocked-login-page.png`, `playwright/screenshots/auth-blocked-console-errors.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 0 JS | alleen failed login fetch |
| Warnings | 0 | |

**Details**:
```
POST /api/auth/login → 401
{"error":"Email address or password is incorrect"}
```

---

## Netwerk requests

| Endpoint | Methode | Status | Opmerking |
|----------|---------|--------|-----------|
| /api/auth/login | POST | 401 | bootstrap-wachtwoord niet geldig op preview |

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- Geen product-blocker in de tab-diff

### Suggesties (optioneel)
- Preview: bootstrap-wachtwoord in container/migratie zetten zodat agents kunnen inloggen

### Niet-gerelateerde observaties
- localhost:5178 gaf 200, backend :3008 down — lokale E2E evenmin mogelijk zonder server te starten

---

## Beperkingen van deze test

- [x] Authenticatie: login required — preview 401
- [ ] Drag & drop: niet testbaar via browser MCP, handmatige test vereist
- [x] Server niet zelf gestart (projectregel)
