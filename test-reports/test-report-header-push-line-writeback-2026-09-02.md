# Testrapport: Header push line write-back (#AB:302)

**Datum**: 2026-09-02
**Tester**: Cursor Agent
**App URL**: https://preview-header-push-line-wri.graysand-65442c41.northeurope.azurecontainerapps.io
**App versie**: v1.52.127
**Geteste wijzigingen**: gepushte header write-back, bulk-dialoog bij multi-select, D365-icoon, history-vouw

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | SKIP | Login faalde |
| Interactie | SKIP | Login faalde |
| Console | SKIP | Alleen login-pagina |
| Netwerk | SKIP | Geen authenticated API |
| Unit tests | PASS | 56 tests in 8 bestanden |

**Totaal resultaat**: PARTIAL (unit PASS, browser SKIP)

---

## Geteste scenario's

### Scenario 1: Preview openen als staff

**Stappen**:
1. Navigeer naar preview-URL
2. Login `admin@example.com` / `Bootstrap123!`

**Verwacht resultaat**: PO-board
**Werkelijk resultaat**: "Email address or password is incorrect"
**Status**: FAIL (auth, niet de feature)

### Scenario 2: Unit — bulk-dialoog bij gepushte header

**Stappen**: Vitest `usePurchaseOrderBulkEdit` + `correctAllLines`

**Verwacht resultaat**: dialoog bij multi-select; single = 1 PO; bulk = N POs; skip bij gelijke unique value
**Werkelijk resultaat**: 14 bulk-tests groen
**Status**: PASS

### Scenario 3: Unit — fan-out / supplier 403 / history-vouw

**Stappen**: `correctAllDetailFields`, `dataAccess`, `usePurchaseOrderCorrectAllLines`

**Verwacht resultaat**: staff-only, cap, skip-equals, history-flag op alle bijgewerkte regels
**Werkelijk resultaat**: tests groen
**Status**: PASS

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Sign-in | Ja | Ja | Preview login |
| PO-board / write-back cel | Nee | — | Geen sessie |
| Bulk-dialoog | Nee | — | Geen sessie |

**Screenshots**: `playwright/screenshots/ui-review-header-push-line-writeback.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 1 | Login-fout (verwacht na foute credentials) |
| Warnings | 0 | |

---

## Netwerk requests

Niet geïnspecteerd voorbij login.

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- Geen voor de feature-code.

### Suggesties
- Preview-staff-account documenteren of test-credentials in de sessie houden voor browser-checks.

### Niet-gerelateerde observaties
- Bootstrap-account uit AGENTS.md werkt niet op deze preview.

---

## Beperkingen van deze test

- [x] Authenticatie: niet getest (verkeerde credentials op preview)
- [ ] Drag & drop: n.v.t.
- Functionele dekking via Vitest i.p.v. UI-klikken
