---
name: perf-scroll
description: >-
  Meet scroll- en interactie-jank op de PO-board (en later andere scroll-containers):
  longframes tijdens wheel, time-to-stable, expand-row lazy load. Voedt backlog J4/J5.
  Gebruik bij "scroll meten", "scroll performance", "jank PO board", "perf scroll",
  als onderdeel van perf-orchestrate scout-fase.
---

# Perf Scroll — scroll & interactie-jank

> **Rol:** Scroll Scout · **Skill:** `perf-scroll`
>
> **Verwant:** `perf-review` (route/tab screening), `perf-orchestrate` (roept deze skill aan na J1–J3),
> `perf-architect` / `perf-optimize` (L5 virtualisatie, memo, progressive render).

## Waarom apart van perf-review?

`perf-review` meet **navigatie en tab-switches** (elapsedWall, Server-Timing, API-sum).
Scroll raakt UX **direct** (jank, stotteren) maar valt daar buiten. Daarom:

| Keuze | Besluit |
|-------|---------|
| Nieuwe skill vs J4 in scout | **Beide:** journey **J4** in backlog/schema; meetlogica in **`perf-scroll`** |
| Aparte Playwright | `playwright/perf-scroll.js` (niet alles in `perf-scout.js`) |

---

## Journeys (scroll-scope)

| ID | Actie | Primaire metric | Typische fix-tier |
|----|-------|-----------------|-------------------|
| **J4** | PO board — verticaal scrollen (wheel, ~15 stappen) | `maxLongFrameMs` | L3–L5 (memo, progressive render, virtualisatie) |
| **J5** | PO rij expand → line details zichtbaar | `expandStableMs` | L2–L4 (lazy fetch, cache) |
| **J6** | Horizontale kolom-scroll (sticky headers) | `maxLongFrameMs` | L3–L4 |

v1 pipeline: **J4 verplicht** in scout; J5/J6 wanneer policy `scopePhase >= v2`.

---

## UX-metrics (voorstel — opnemen in baseline)

| Metric | Wat | Gate? |
|--------|-----|-------|
| `maxLongFrameMs` | Slechtste blocking frame tijdens scroll | **Ja** (J4 primary) |
| `scrollJankMs` | Som `blocking` van longframes tijdens scrollvenster | Informatief / secundair |
| `scrollStableMs` | Tijd na laatste wheel tot geen longframe >50 ms blocking | Ja voor J5 expand |
| `slowInteractionCount` | Event Timing >100 ms tijdens scroll | Diagnose (render vs input) |
| `visibleRowCount` / `domRowCount` | Progressive render gap | Alleen drilldown |

Doelen staan in `test-reports/perf-optimize-policy.json` → `scrollTargets`.

---

## Workflow

```
Scroll Progress:
- [ ] Stap 0: Zelfde env als scout (Azure DEV, seed M/L)
- [ ] Stap 1: Login + board ready (J1 voorwaarde)
- [ ] Stap 2: Run playwright/perf-scroll.js (profiel M + L)
- [ ] Stap 3: Merge scroll-metrics in perf-baseline.json
- [ ] Stap 4: Backlog-items J4+ toevoegen/updaten in perf-backlog.json
- [ ] Stap 5: Korte sectie in perf-review rapport + hudWatch scroll-regel
```

### Stap 2 — Script

```bash
# Na seed profiel L:
PERF_PROFILE=L TEST_BASE_URL=<azure-dev> node playwright/perf-scroll.js
```

Output: `test-reports/perf-scroll-<datum>.md`, metrics in baseline onder `scrollJourneys`.

### Stap 4 — Backlog

Nieuwe items krijgen id `BL-004`, `BL-005`, … Journey `J4`/`J5`.  
`priorityScore` voor scroll:

```
priorityScore = (maxLongFrameMs − targetLongFrameMs) × routeFrequencyWeight
```

`routeFrequencyWeight` = zelfde PO-board weight als J1 (`/`).

---

## Integratie orchestrate

In **`perf-orchestrate` scout-fase** (na `perf-review` / `perf-scout.js`):

1. `node playwright/perf-scout.js` (J1–J3)
2. **`perf-scroll`** → `node playwright/perf-scroll.js` (J4, optioneel J5)
3. Merge backlog; sorteer op `priorityScore`

Scroll-fixes doorlopen dezelfde loop: architect → optimize → verify → adversary.

### Verify (scroll)

- Herhaal `perf-scroll.js` op **S+M+L**
- **PASS** als `maxLongFrameMs` ≥ policy `scrollTargets.reductionPercent` t.o.v. baseline
- `browser-feature-test`: board scroll + expand nog functioneel

---

## Hele app (niet alleen dagelijkse paden)

Policy `scopePhases`:

| Fase | Wat |
|------|-----|
| v1 | J1–J3 load-paden |
| v1.1 | + J4 scroll PO |
| v2 | + J5/J6 + perf-review **volledige route/tab screening** |
| v3 | Admin, BI, settings — alle authenticated routes |

Orchestrate `runMode: full` werkt backlog af tot leeg (max iteraties); scope groeit met policy-fase, niet met handmatige journey-lijst.

---

## Instrumentatie in code

Bestaand: `src/utils/perf.js` → `[perf] longframe`, `[perf] interaction`, `measure()`.

Bij scroll-fixes:

- Wrap zware row-build in `measure('board:rows', …)`
- Overweeg `React.memo` op `PurchaseOrdersBoardRows` (tier L3+)
- L5: virtualisatie — alleen zichtbare rijen renderen

---

## Artifacts

| Bestand | Inhoud |
|---------|--------|
| `playwright/perf-scroll.js` | Automatische scroll-meting |
| `test-reports/perf-scroll-*.md` | Rapport |
| `test-reports/perf-baseline.json` | `scrollJourneys.J4` |
| `public/perf-baseline.json` | `hudWatch` entry `po-scroll-jank` |

Zie [reference.md](reference.md) voor drempels en selectors.
