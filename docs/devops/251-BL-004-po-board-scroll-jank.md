# BL-004: PO-bord scroll-jank fix — rAF-gate op scroll-listener (DevOps)

**Work item:** [#AB:251](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/251)  
**Doel:** Scroll-jank op het PO-bord elimineren via een rAF-gate in `useBoardRowWindow.js` (tier L1 render-scheduling fix)  
**Referentie in repo:** [.cursor/plans/dev_2026-08-10-BL-004-po-board-scroll-jank.plan.md](../.cursor/plans/dev_2026-08-10-BL-004-po-board-scroll-jank.plan.md)  
**Tags:** `performance; po-board; frontend; BL-004`

---

## User Story

**Als** gebruiker van het inkooporderbord  
**wil ik** vloeiend verticaal kunnen scrollen zonder merkbare hapering  
**zodat** ik snel door grote orderlijsten (~2000 orders) kan navigeren zonder afleiding

---

## Acceptatiecriteria (definitie van "klaar")

1. `maxLongFrameMs` op Azure DEV ≤ **1177ms** (≥ 30% reductie t.o.v. baseline ~1681ms) — gemeten met **20 runs**, profiel L, J4-journey, **same-instance** (baseline én na-meting op dezelfde Container App)
2. Geen regressie op bestaande unit tests in `useBoardRowWindow.test.jsx`
3. `useBoardRowWindow.js` blijft onder 300 regels
4. Scroll-gedrag functioneel identiek (juiste rijen gemount bij alle scrollposities)
5. PR gemerged naar `develop`

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Volledige performance-analyse uitgevoerd | `.cursor/plans/dev_2026-08-10-BL-004-po-board-scroll-jank.plan.md` |
| rAF-gate fix geïmplementeerd (later teruggedraaid) | commit `752b563` op `feature/BL-004-po-board-scroll-jank` |
| Navigatiebug meettool gefixt | commit `9c4c96a` op `feature/BL-004-po-board-scroll-jank` |
| 3× baseline meting gedaan (20 runs stabielste) | zie meetresultaten hieronder |

---

## Backlog — tasks

- [ ] Cherry-pick `752b563` (rAF-gate op scroll-listener in `useBoardRowWindow.js`)
- [ ] Cherry-pick `9c4c96a` (navigatiebug `playwright/perf-scroll.js` — All-orders tab na elke `page.goto`)
- [ ] Baseline meting op **bestaande** Azure DEV-app — 20 runs vóór deploy
- [ ] Fix deployen naar diezelfde Azure DEV-app (same-instance verplicht)
- [ ] Na-meting op dezelfde Azure DEV-app — 20 runs
- [ ] PR aanmaken van `feature/BL-004-po-board-scroll-jank` naar `develop`

**Optioneel (escalatie als rAF-gate < 30% reductie geeft):**

- [ ] Overscan verlagen: 14 → 6–8 in `PurchaseOrdersBoardRows.jsx`
- [ ] `Tooltip`-wrappers in `PurchaseOrderProductImageCell.jsx` lazy mounten bij hover

---

## Technische context

| Bestand | Rol |
|---|---|
| `src/hooks/useBoardRowWindow.js` | **Fix hier** — rAF-gate op scroll-listener |
| `src/components/supplier/PurchaseOrdersBoardRows.jsx` | Gebruikt de hook, overscan = 14 |
| `src/components/supplier/PurchaseOrderBoardRow.jsx` | Rij/cel-rendering, memoization |
| `src/components/supplier/PurchaseOrderProductImageCell.jsx` | Tooltip-kandidaat voor lazy mount |
| `playwright/perf-scroll.js` | J4-meetscript — bevat navigatiebug (cherry-pick `9c4c96a`) |
| `src/utils/perf.js` | `measure()`, longframe-observer |
| `test-reports/perf-optimize-policy.json` | Drempels, scaleProfiles (L = 2000 orders) |

---

## Commits (cherry-pickbaar — op `feature/BL-004-po-board-scroll-jank`)

```bash
git show 9c4c96a   # fix(perf-scroll): navigeer naar All-orders tab bij elke scroll-run
git show 752b563   # perf: rAF-gate scroll-window update op PO-board [BL-004 tier L1]
```

---

## Meetresultaten (referentie)

| Meting | Instance | Runs | maxLongFrameMs (mediaan) |
|---|---|---:|---:|
| Baseline A | Azure DEV (bestaand) | 3 | 1970ms |
| Baseline B | Azure DEV (bestaand) | 5 | 1094ms |
| **Baseline C (stabielste)** | **Azure DEV (bestaand)** | **20** | **1681ms** |
| Na fix (ongeldige vergelijking ⚠️) | Preview-container (nieuw) | 20 | 2031ms |

> De post-fix meting is **ongeldig** door infra-mismatch (andere Container App). Niet als "fix mislukt" lezen.

---

## Commit conventie

Alle commits die bij dit work item horen bevatten `#AB:251`:

```
feat: beschrijving #AB:251
```

---

## Versie document

Aangemaakt op basis van `.cursor/plans/dev_2026-08-10-BL-004-po-board-scroll-jank.plan.md`; wijzig dit bestand bij nieuwe afspraken.
