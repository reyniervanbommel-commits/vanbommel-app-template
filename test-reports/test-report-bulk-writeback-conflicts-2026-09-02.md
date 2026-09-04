# Testrapport: Bulk write-back background job (#295)

**Datum**: 2026-09-02
**Tester**: Cursor Agent
**App URL**: http://localhost:5178 (v1.52.126 — **niet** feature-branch v1.53.3)
**App versie**: code v1.53.3; browser zag v1.52.126
**Geteste wijzigingen**: achtergrond D365-bulk, header-badge, cell-lock, retry, D365-icoon, spinner in cel

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | SKIP | Verkeerde lokale build |
| Interactie | SKIP | Login/feature-UI van deze branch niet geladen |
| Console | SKIP | Errors van andere sessie/build |
| Netwerk | SKIP | |

**Totaal resultaat**: SKIP (unit tests PASS)

---

## Geteste scenario's

### Scenario 1: Unit tests achtergrondjob

**Stappen**:
1. `npx vitest run` op bulk-edit hooks, run-helper, retry, FailedRows, D365 writeBackField, data-route

**Verwacht resultaat**: groen
**Werkelijk resultaat**: 21 hook-tests groen na aanpassing op `status === 'success'`; eerder 3 failures wachtten op `job === null`
**Status**: PASS

### Scenario 2: Browser Apply to selected rows

**Stappen**:
1. Tab localhost:5178/login geopend
2. Footer toont DEV v1.52.126 — niet v1.53.3
3. Preview-URL timeout

**Verwacht resultaat**: badge Write-back n/total + D365-icoon
**Werkelijk resultaat**: feature niet in de draaiende app
**Status**: SKIP

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Login | Ja | Ja | Andere build |
| Write-back badge | Nee | — | Niet deze versie |

**Screenshots**: `playwright/screenshots/ui-review-bulk-writeback-login.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | (andere sessie) | 500/401 op `/api/auth/login`; later connection refused |
| Warnings | 0 | |

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- Geen, in unit tests

### Suggesties
- Feature-branch lokaal draaien (`npm run dev:all` in deze worktree) om badge, cell-lock en spinner visueel te checken

### Niet-gerelateerde observaties
- Open Playwright-tabs stonden op andere preview-URL’s

---

## Beperkingen van deze test

- [x] Authenticatie: niet getest op deze branch (verkeerde lokale versie; preview timeout)
- [ ] Drag & drop: n.v.t.
- [x] Server niet zelf gestart (projectregel)
