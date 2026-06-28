# Testrapport: [Feature Naam]

**Datum**: [YYYY-MM-DD]
**Tester**: Cursor Agent
**App URL**: [URL]
**App versie**: [versienummer indien beschikbaar]
**Geteste wijzigingen**: [korte beschrijving of `git diff --name-only` output]

---

## Samenvatting

| Categorie | Status | Opmerkingen |
|-----------|--------|-------------|
| Visueel | PASS/FAIL | |
| Interactie | PASS/FAIL | |
| Console | PASS/FAIL | |
| Netwerk | PASS/FAIL | |

**Totaal resultaat**: PASS / FAIL

---

## Geteste scenario's

### Scenario 1: [Beschrijving]

**Stappen**:
1. [Actie uitgevoerd]
2. [Actie uitgevoerd]

**Verwacht resultaat**: [Wat er zou moeten gebeuren]
**Werkelijk resultaat**: [Wat er daadwerkelijk gebeurde]
**Status**: PASS / FAIL

---

### Scenario 2: [Beschrijving]

**Stappen**:
1. [Actie uitgevoerd]
2. [Actie uitgevoerd]

**Verwacht resultaat**: [Wat er zou moeten gebeuren]
**Werkelijk resultaat**: [Wat er daadwerkelijk gebeurde]
**Status**: PASS / FAIL

---

## Visuele controle

| Element | Aanwezig | Correct | Opmerking |
|---------|----------|---------|-----------|
| [Element 1] | Ja/Nee | Ja/Nee | |
| [Element 2] | Ja/Nee | Ja/Nee | |

**Screenshots**: `test-reports/[feature]-before.png`, `test-reports/[feature]-after.png`

---

## Console output

| Type | Aantal | Details |
|------|--------|---------|
| Errors | 0 | |
| Warnings | 0 | |

**Details** (indien van toepassing):
```
[Console output hier — letterlijk kopiëren, niet samenvatten]
```

---

## Netwerk requests

| Endpoint | Methode | Status | Opmerking |
|----------|---------|--------|-----------|
| [/api/...] | GET/POST | 200 | |

---

## Bevindingen & aanbevelingen

### Kritiek (moet opgelost)
- [Beschrijving van kritieke bevinding]

### Suggesties (optioneel)
- [Beschrijving van suggestie]

### Niet-gerelateerde observaties
- [Bugs of issues die niet bij deze feature horen maar wel opvielen]

---

## Responsive test

> Alleen invullen als de wijziging layout-gerelateerd is.

| Viewport | Status | Opmerking |
|----------|--------|-----------|
| Desktop (1280x720) | PASS/FAIL | |
| Mobiel (375x667) | PASS/FAIL | |
| Tablet (768x1024) | PASS/FAIL | |

---

## Beperkingen van deze test

- [ ] Authenticatie: sessie was al actief / moest handmatig inloggen / niet getest
- [ ] Drag & drop: niet testbaar via browser MCP, handmatige test vereist
- [ ] [Andere beperkingen]
