# Testrapport: RCCP confirmed delivery date

**Datum**: 2026-08-28
**Tester**: Cursor Agent
**App URL**: https://preview-rccp-confirmed-deliv.graysand-65442c41.northeurope.azurecontainerapps.io
**App versie**: v1.52.47
**Geteste wijzigingen**: matrix-label toggles, echte receipts onder de as, overcapacity groen vanaf +1, geen rood op ordered/received/remaining

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | SKIPPED | Preview-login geweigerd |
| Interactie | SKIPPED | Geen sessie |
| Console | SKIPPED | Alleen login-pagina |
| Netwerk | SKIPPED | Geen dashboard-calls |

**Totaal resultaat**: FAIL (auth-blokkade; unit tests op de logica zijn groen)

---

## Geteste scenario's

### Scenario 1: Preview inloggen

**Stappen**:
1. Navigate naar preview-URL
2. Sign in met lokale testcredentials

**Verwacht resultaat**: dashboard
**Werkelijk resultaat**: "Email address or password is incorrect"
**Status**: FAIL (testersessie, geen productbug bewezen)

### Scenario 2: Matrix Requested/Confirmed als knoppen

**Stappen**: niet uitgevoerd in de browser
**Verwacht resultaat**: labels zijn ToggleButtons; één planning-rij actief en gemarkeerd
**Werkelijk resultaat**: n.v.t.
**Status**: SKIPPED — gedekt door `rccpMatrixRows.test.js`

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| Sign in | Ja | Ja | Preview login |
| RCCP matrix | Nee | — | Achter auth |

**Screenshots**: `playwright/screenshots/ui-review-rccp-confirmed-delivery.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 1 | Onbekend (login-pagina, eerdere sessie) |
| Warnings | 0 | |

---

## Netwerk requests

Niet geïnspecteerd voorbij login.

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- Geen: auth-blokkade is omgeving, geen regressie in de featurecode

### Suggesties (optioneel)
- Preview-testaccount beschikbaar maken voor browser-checks

### Niet-gerelateerde observaties
- —

---

## Beperkingen van deze test

- [x] Authenticatie: niet getest (credentials geweigerd)
- [ ] Drag & drop: niet testbaar via browser MCP, handmatige test vereist
- Unit tests: `rccpPoSegments`, `rccpStatus`, `rccpPlanningDateView`, `rccpMatrixRows` groen
