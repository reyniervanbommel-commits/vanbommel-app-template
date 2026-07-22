---
name: perf-board-actions
description: >-
  Meet snelheid van PO-board kolomacties: filter toepassen (Apply) en text style wijzigen
  (bold/kleur). Journeys J7/J8, backlog BL-005+. Gebruik bij "filter snelheid", "text style
  performance", "kolommenu traag", "perf board actions", als onderdeel van perf-orchestrate scout.
---

# Perf Board Actions — filter & text style

> **Rol:** Board Interaction Scout · **Skill:** `perf-board-actions`
>
> **Verwant:** `perf-scroll` (J4 scroll), `perf-orchestrate`, `perf-architect`, `perf-optimize`.

## Journeys

| ID | Actie | Primaire metric | Typische bottleneck |
|----|-------|-----------------|---------------------|
| **J7** | Kolomfilter: waarde invullen → **Apply** → board gefilterd | `filterApplyMs` | Client filter (`tableViewFilterUtils`), re-render alle rijen |
| **J8** | Kolommenu → **Text style** → toggle **Bold** (persist) | `textStyleApplyMs` | Layout save API + full column re-render |

Beide zijn **high-frequency UX** (power users) — los van load (J1–J3) en scroll (J4).

---

## UX-metrics

| Metric | Definitie | Gate? |
|--------|-----------|-------|
| `filterApplyMs` | Klik Apply → UI stabiel (geen longframe >50 ms blocking, 300 ms rust) | **Ja** (J7) |
| `textStyleApplyMs` | Klik Bold → persist klaar (geen pending API + UI stabiel) | **Ja** (J8) |
| `maxLongFrameMs` | Slechtste frame tijdens actie | Secundair |
| `slowInteractionCount` | Event Timing >100 ms | Diagnose |
| `layoutSaveMs` | API `/canvas` of layout PATCH (indien zichtbaar in console) | Informatief |

Doelen: `test-reports/perf-optimize-policy.json` → `boardActionTargets`.

---

## Workflow

```
Board Actions Progress:
- [ ] Stap 0: Azure DEV + seed profiel M/L (zelfde als scout)
- [ ] Stap 1: Login als admin (text style vereist rechten)
- [ ] Stap 2: node playwright/perf-board-actions.js
- [ ] Stap 3: Backlog BL-005 (J7), BL-006 (J8) + baseline merge
```

```bash
PERF_PROFILE=L TEST_BASE_URL=<azure-dev> node playwright/perf-board-actions.js
```

---

## UI-selectors (PO board)

| Stap | Selector |
|------|----------|
| Kolommenu openen | `[data-column-menu-trigger="true"]` (eerste kolom) |
| Filter waarde | `aria-label` contains `Filter value for` |
| Apply | knop **Apply** |
| Text style submenu | knop **Text style** (Appearance) |
| Bold | `aria-label="Toggle bold"` |

---

## Integratie orchestrate

Na `perf-scroll` in scout-fase (policy `scopePhases` ≥ v1.2):

```
perf-scout → perf-scroll → perf-board-actions → loop
```

Fix-loop identiek aan andere backlog-items (architect → optimize → verify → adversary).

### Verify

- Herhaal script op S+M+L
- PASS als `filterApplyMs` / `textStyleApplyMs` ≥ policy reductie t.o.v. baseline
- `browser-feature-test`: filter + text style nog functioneel

---

## Optimize hints (architect)

| Journey | Tier | Richting |
|---------|------|----------|
| J7 | L2–L4 | Memo filter pipeline, debounce Apply, incremental row filter |
| J8 | L2–L3 | Optimistic UI, batch layout saves, column style cache |

---

## Artifacts

| Bestand | Inhoud |
|---------|--------|
| `playwright/perf-board-actions.js` | Automatische meting |
| `test-reports/perf-board-actions-*.md` | Rapport |
| `test-reports/perf-baseline.json` | `boardActionJourneys.J7/J8` |
| `public/perf-baseline.json` | HUD watch `po-filter-apply`, `po-text-style` |

Zie [reference.md](reference.md).
