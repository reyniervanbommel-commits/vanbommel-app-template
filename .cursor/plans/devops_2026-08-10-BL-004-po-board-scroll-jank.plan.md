---
name: BL-004-po-board-scroll-jank
overview: >
  Verticale scroll-jank op het PO-bord elimineren via een rAF-gate op de
  scroll-event-listener in useBoardRowWindow.js (tier L1 render-scheduling fix).
  Meting toont median maxLongFrameMs van 1681ms (drempel 80ms). Fix is eerder
  geïmplementeerd en bewezen correct, maar teruggedraaid na inconclusive verificatie
  door infra-mismatch. Herimplementatie + same-instance verificatie is de taak.
todos:
  - id: bl004-cherry-pick-fix
    content: Cherry-pick 752b563 (rAF-gate op scroll-listener in useBoardRowWindow.js) naar develop.
    status: pending
  - id: bl004-cherry-pick-navfix
    content: Cherry-pick 9c4c96a (navigatiebug playwright/perf-scroll.js — All-orders tab na elke page.goto).
    status: pending
  - id: bl004-baseline-meting
    content: Baseline meting op bestaande Azure DEV-app (20 runs, profiel L = 2000 orders, J4-journey). maxLongFrameMs vastleggen vóór de fix.
    status: pending
  - id: bl004-deploy-dev
    content: Fix deployen naar diezelfde Azure DEV-app (niet een nieuwe preview-container). Same-instance is verplicht voor valide vergelijking.
    status: pending
  - id: bl004-na-meting
    content: Na-meting op dezelfde Azure DEV-app (20 runs). Doel = 30% reductie op maxLongFrameMs (van ~1681ms naar ≤1177ms).
    status: pending
  - id: bl004-optioneel-overscan
    content: Optioneel (als rAF-gate onvoldoende is) — overscan verlagen van 14 naar 6–8 in PurchaseOrdersBoardRows.jsx. Minder mount-werk per scroll-stap.
    status: pending
  - id: bl004-optioneel-tooltip
    content: Optioneel (als overscan onvoldoende is) — Tooltip-wrappers in PurchaseOrderProductImageCell.jsx pas mounten bij hover, niet bij rij-mount.
    status: pending
  - id: bl004-pr
    content: PR aanmaken van feature/BL-004-po-board-scroll-jank naar develop, na geslaagde verificatie.
    status: pending
isProject: false
---

# DevOps Work Item — BL-004: PO-bord scroll-jank fix

## Type
User Story / Bug Fix

## Prioriteit
Hoog — median maxLongFrameMs van **1681ms** (drempel: 80ms, doelreductie: 30%)

## Labels
`performance` `po-board` `frontend` `BL-004`

---

## Omschrijving

Op de PO-tabel-pagina treedt aantoonbare scroll-jank op bij verticaal scrollen over het inkooporderbord. Meting via de Long Animation Frame API (20 runs, profiel L = ~2000 orders) toont een mediaan van **1681ms maxLongFrameMs** — ruim boven de 80ms-drempel. Dit is geen meetruis.

**Het board is al volledig gevirtualiseerd** (custom windowing-hook `useBoardRowWindow.js`, L5-niveau). De jank zit niet in te veel DOM-nodes, maar in de scroll-event-handler die meerdere keren per animation frame viert en elke keer een React-re-render triggert (setRange → reconciliatie → mount/unmount van ~25 Fluent UI-kolommen per rij).

**De fix is eerder geïmplementeerd en correct van aanpak**, maar teruggedraaid na een inconclusive verificatie. De mislukking zat in de methodiek: pre-fix meting op de bestaande DEV-app, post-fix meting op een gloednieuwe preview-container (andere infra, andere cold-start). Er is **geen same-instance vergelijking** geweest — de conclusie "fix werkt niet" is dus ongeldig.

---

## Root cause

`useBoardRowWindow.js` — de `scroll`-event-listener roept synchroon `setRange()` aan zonder animation-frame-gate. Bij snel wheel/trackpad-scrollen kan `scroll` 5–10× per frame vuren. Elke aanroep triggert een React-re-render + reconciliatie voor de nieuw te mounten rijen. Dit stapelt binnen één frame-taak en blokkeert de main thread voor >1000ms.

---

## Oplossing (tier L1 — render scheduling)

Één wijziging in `src/hooks/useBoardRowWindow.js`: een `requestAnimationFrame`-gate die meerdere scroll-events binnen dezelfde frame coalesceert tot één `setRange()`-aanroep.

De exacte code staat in commit `752b563` op `feature/BL-004-po-board-scroll-jank` (origin gepusht, niet gemerged naar develop). Herimplementatie via cherry-pick is de snelste route.

**Trade-off:** window-update kan tot 1 frame (~16ms) later landen. Verwaarloosbaar, geen functionele wijziging aan wélke rijen worden gemount.

---

## Acceptatiecriteria

- [ ] `maxLongFrameMs` op Azure DEV ≤ **1177ms** (≥ 30% reductie t.o.v. baseline van ~1681ms) — gemeten met **20 runs**, profiel L, J4-journey, same-instance (baseline en na-meting op dezelfde Container App)
- [ ] Geen regressie op bestaande unit tests in `useBoardRowWindow.test.jsx`
- [ ] Component `useBoardRowWindow.js` blijft onder 300 regels
- [ ] Scroll-gedrag functioneel identiek (juiste rijen gemount bij alle scrollposities)
- [ ] PR gemerged naar `develop`

---

## Subtaken

| # | Taak | Branch |
|---|---|---|
| 1 | Cherry-pick `752b563` (rAF-gate fix) | `feature/BL-004-po-board-scroll-jank` |
| 2 | Cherry-pick `9c4c96a` (navigatiebug perf-scroll.js) | idem |
| 3 | Baseline meting op Azure DEV (20 runs vóór deploy) | — |
| 4 | Deploy naar diezelfde Azure DEV-app | — |
| 5 | Na-meting op dezelfde Azure DEV-app (20 runs) | — |
| 6 | PR aanmaken naar `develop` | — |

**Optioneel (als rAF-gate < 30% reductie geeft):**

| # | Taak |
|---|---|
| 7 | Overscan verlagen: 14 → 6–8 in `PurchaseOrdersBoardRows.jsx` |
| 8 | Tooltip-wrappers in `PurchaseOrderProductImageCell.jsx` lazy mounten bij hover |

---

## Technische context

| Bestand | Rol |
|---|---|
| `src/hooks/useBoardRowWindow.js` | **Fix hier** — rAF-gate op scroll-listener |
| `src/components/supplier/PurchaseOrdersBoardRows.jsx` | Gebruikt de hook, overscan = 14 |
| `src/components/supplier/PurchaseOrderBoardRow.jsx` | Rij/cel-rendering, memoization |
| `src/components/supplier/PurchaseOrderProductImageCell.jsx` | Tooltip-kandidaat voor lazy mount |
| `playwright/perf-scroll.js` | J4-meetscript — bevat navigatiebug (cherry-pick 9c4c96a) |
| `src/utils/perf.js` | `measure()`, longframe-observer |
| `test-reports/perf-optimize-policy.json` | Drempels, scaleProfiles (L = 2000 orders) |

---

## Commits (git-historie, cherry-pickbaar)

```
git show 9c4c96a   # fix(perf-scroll): navigeer naar All-orders tab bij elke scroll-run
git show 752b563   # perf: rAF-gate scroll-window update op PO-board [BL-004 tier L1]
```

Branch: `feature/BL-004-po-board-scroll-jank` (gepusht naar origin, niet gemerged)

---

## Meetresultaten (referentie)

| Meting | Instance | Runs | maxLongFrameMs (mediaan) |
|---|---|---:|---:|
| Baseline A | Azure DEV (bestaand) | 3 | 1970ms |
| Baseline B | Azure DEV (bestaand) | 5 | 1094ms |
| **Baseline C (stabielste)** | **Azure DEV (bestaand)** | **20** | **1681ms** |
| Na fix (ongeldige vergelijking) | Preview-container (nieuw) | 20 | 2031ms |

> De post-fix meting is ongeldig door infra-mismatch. Niet als "fix mislukt" lezen.

---

## Notities voor de uitvoerende agent

1. **Verifieer altijd same-instance** — pre- en post-meting moeten op exact dezelfde Container App draaien.
2. **Gebruik minimaal 20 runs** — bij 5 runs was de spreiding te groot (1094–1970ms).
3. **Lokaal testen** kan ook: `node scripts/seed-perf-po-cache.js --orders=2000 --lines=3` + `npm run dev:all`. Vereist een lokale SQL Server (Docker of Windows-service).
4. `/refresh/progress`-endpoint is **onbetrouwbaar** op multi-replica setups. Verifieer via daadwerkelijke paginaload of rijen aanwezig zijn.
5. Gerelateerd plan (volledige analyse): `.cursor/plans/dev_2026-08-09-po-board-scroll-jank.plan.md` op branch `docs/po-board-scroll-jank-plan`.
