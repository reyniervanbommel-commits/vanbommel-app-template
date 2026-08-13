# PO-bord scroll-optimalisaties (vervolg BL-004) — Tier A, B, C

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **DevOps:** Feature [#252](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/252)
> · Stories [#253](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/253) (Tier A),
> [#254](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/254) (Tier B),
> [#255](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/255) (Tier C — geparkeerd).
> Repo-doc: `docs/devops/252-po-board-scroll-optimalisaties.md`.

**Goal:** Resterende scroll-/render-bottlenecks op het PO-bord aanpakken (vervolg op BL-004),
gebaseerd op monday.com- en D365 F&O-patronen, in drie tiers. Doel na Tier A+B:
`maxLongFrameMs ≤ 700ms` (mediaan, 20 runs, profiel L, J4, same-instance DEV).

**Architecture:** Puur frontend. Rij-windowing blijft in `useBoardRowWindow`; Tier A verbetert
scheduling + CSS containments; Tier B voegt kolom-windowing + directional overscan toe en
optimaliseert bestaande sticky/Tooltip-paden; Tier C (paint-then-hydrate / idle cells) blijft
**geparkeerd** tot een expliciete go na meting.

**Tech Stack:** React 18, Fluent UI v9, Vitest, Playwright `perf-scroll` (J4).

**User story:**
Als gebruiker van het PO-bord wil ik vloeiend verticaal én horizontaal kunnen scrollen
(met vaste contextkolommen), zodat grote orderlijsten (~2000) aanvoelen als een professionele
ERP-grid zonder merkbare jank.

**Acceptatiecriteria (globaal — Definition of Done Feature #252):**
- [ ] Tier A (#253) haalt `maxLongFrameMs ≤ 800ms` (mediaan 20 runs, profiel L, J4, same-instance).
- [ ] Tier B (#254) haalt `maxLongFrameMs ≤ 700ms` onder dezelfde meetmethode; geen header/body
      misalignment; sticky correct bij zoom 100/125/150%.
- [ ] Tier C (#255) is **niet** geïmplementeerd tenzij schriftelijke go na Tier-B-meting
      (`maxLongFrameMs` nog > 700ms).
- [ ] Geen regressie op `useBoardRowWindow` / board unit tests; gewijzigde bestanden ≤ 300 regels
      (split eerst waar nodig).
- [ ] Versienummer verhoogd in `src/config/version.js`; `devTestItem` toegevoegd.
- [ ] Commits met `#AB:252` (en child-id waar relevant).

**Tags:** `performance; po-board; scroll; virtualization; BL-004-vervolg`

---

## Feiten & constraints (vastgelegd — geen open keuzes)

1. **BL-004 rAF-gate staat NIET op `develop`.** De fix is gemerged en daarna gerevert
   (o.a. `2673410`). Feature-tekst “−40% al gehaald / rAF live” is **onjuist**. Tier A begint
   daarom met **herstel van de rAF-gate** (referentie: `752b563` / `87c662e`), daarna A1–A4.
2. **Meetmethode (verplicht, alle tiers):** `playwright/perf-scroll.js` journey **J4**,
   profiel **L** (~2000 orders), **20 runs**, mediaan `maxLongFrameMs`, **same-instance**
   Azure DEV (of localhost ACC met gelijke seed). Pre- én post-meting op dezelfde omgeving.
3. **Sticky bestaat al** via `usePurchaseOrdersBoardStickyColumns` + `stickyLeft`.
   B4 = alleen GPU compositing-hints op bestaande sticky cellen — **geen** nieuwe sticky UX.
4. **`PurchaseOrderBoardRow.jsx` ≈ 368 regels** → harde stop. Vóór B1 eerst splitsen tot <300.
5. **Engelse UI** (aria/hints indien toegevoegd). Geen backend/SQL.
6. **A2/A4 veiligheidsgrenzen:**
   - A2 `content-visibility: auto` alleen op niet-expanded order-rijen; nooit op expanded slots.
   - A4 gebruik `contain: layout` (niet `content`) of beperk tot pure tekstcellen — geen
     image/remarks/controls-cellen (voorkomt knippen van popovers/Tooltips).
7. **Tier C geparkeerd** tot go na Tier-B-meting.

### Referentiecijfers (historisch; niet als huidige stand lezen)

| Metric | Baseline (pre-BL-004) | Claim “na BL-004” (niet meer op develop) |
|--------|----------------------|------------------------------------------|
| maxLongFrameMs | 1681ms | 1012ms (−39.8%) — **niet herhaalbaar tot rAF terug is** |
| scrollJankMs | 2924ms | 1493ms |
| longframeCount | 7 | 2 |

Nieuwe baseline meten ná herstel rAF, vóór A1–A4-claim.

### Wat is al gedaan

| Item | Locatie |
|------|---------|
| Rij-virtualisatie L5 | `src/hooks/useBoardRowWindow.js` |
| Overscan = 14 | `src/components/supplier/PurchaseOrdersBoardRows.jsx` |
| Sticky kolommen | `src/hooks/usePurchaseOrdersBoardStickyColumns.js` |
| Tooltip in image-cel (portal-risico) | `src/components/supplier/PurchaseOrderProductImageCell.jsx` |
| Scroll-meetscript J4 | `playwright/perf-scroll.js` |
| Analyse BL-004 | `.cursor/plans/dev_2026-08-09-po-board-scroll-jank.plan.md` |
| BL-004 rAF-implementatie (historie) | commits `752b563`, `87c662e` |

---

## Story #253 — Tier A: CSS/React quick-wins (+ rAF-herstel)

**Files:**
- Modify: `src/hooks/useBoardRowWindow.js`
- Modify: `src/hooks/useBoardRowWindow.test.jsx`
- Modify: `src/components/supplier/PurchaseOrdersBoardRows.jsx`
- Modify: `src/components/supplier/purchaseOrdersBoardRowsStyles.js` (of row/cell styles waar rijen/cellen gestyled worden)
- Modify: `src/config/version.js`, `src/config/devTestItems.js` (aan einde Tier A of Feature)

### Task A0: Herstel rAF-gate (prerequisite)

- [ ] **Step 1:** Schrijf/breid tests in `useBoardRowWindow.test.jsx` zodat scroll-coalescing
      aantoonbaar is (of bestaand gedrag blijft groen na rAF).
- [ ] **Step 2:** Herstel rAF-gate in `useBoardRowWindow.js` volgens `752b563`/`87c662e`:
      `scheduleUpdate` via `requestAnimationFrame`, cleanup met `cancelAnimationFrame`,
      wrap update in `measure('board:window-update', …)`.
- [ ] **Step 3:** `npm test -- useBoardRowWindow` → PASS.
- [ ] **Step 4:** Commit: `perf: herstel rAF-gate scroll-window PO-board #AB:253`

### Task A1: Overscan 14 → 8

- [ ] **Step 1:** In `PurchaseOrdersBoardRows.jsx` zet `overscan: 8`.
- [ ] **Step 2:** Handmatig / browser: snelle wheel — geen witte gaten / ontbrekende rijen.
- [ ] **Step 3:** Commit: `perf: verlaag board-row overscan 14→8 #AB:253`

### Task A2: `content-visibility: auto` op niet-expanded rijen

- [ ] **Step 1:** Voeg style toe (Fluent `makeStyles` + tokens, geen hex) op order-rijen die
      **niet** expanded zijn. Expanded / group-header / spacer rijen uitsluiten.
- [ ] **Step 2:** Verifieer dat `rowHeights` / expand nog kloppen (virtualisatie-offsets).
- [ ] **Step 3:** Commit: `perf: content-visibility op non-expanded board rows #AB:253`

### Task A3: `startTransition` rond `setRange`

- [ ] **Step 1:** In `useBoardRowWindow.js`, wrap `setRange(…)` in `startTransition` (naast rAF).
- [ ] **Step 2:** Tests groen; geen regressie op initiële range.
- [ ] **Step 3:** Commit: `perf: startTransition voor board window setRange #AB:253`

### Task A4: `contain: layout` op veilige cellen

- [ ] **Step 1:** Voeg `contain: 'layout'` toe aan styles van pure data/tekstcellen
      (niet image, remarks, row-controls, sticky-controls).
- [ ] **Step 2:** Open filter-popover / image hover — geen clipping.
- [ ] **Step 3:** Commit: `perf: contain layout op veilige board cellen #AB:253`

### Task A5: Meting + afronding Tier A

- [ ] **Step 1:** Baseline (na A0) + na-meting (na A1–A4), 20× J4, same-instance.
- [ ] **Step 2:** Doel: mediaan `maxLongFrameMs ≤ 800ms`. Resultaat vastleggen in
      `test-reports/` (markdown rapport) en comment op #253.
- [ ] **Step 3:** Alle gewijzigde bestanden ≤ 300 regels; `npm test` groen.
- [ ] **Step 4:** Versie PATCH-bump + desgewenst `devTestItem` “PO board scroll Tier A”.

---

## Story #254 — Tier B: kolom-virtualisatie, directional overscan, Tooltip, sticky GPU

**Volgorde:** B0 (split) → B3 (laag risico) → B2 → B4 → B1 (hoogste risico) → meting.

### Task B0: Prerequisite — split `PurchaseOrderBoardRow.jsx`

**Waarom:** Bestand ≈ 368 regels (hard stop). B1 raakt row/cell rendering.

- [ ] **Step 1:** Extraheer logische stukken (bijv. row-controls, cell-map, expanded wiring)
      naar co-located componenten onder `src/components/supplier/` zodat
      `PurchaseOrderBoardRow.jsx` < 300 blijft.
- [ ] **Step 2:** Bestaande board/row tests groen.
- [ ] **Step 3:** Commit: `refactor(po-board): split PurchaseOrderBoardRow onder 300 regels #AB:254`

### Task B3: Tooltip hover-only in `PurchaseOrderProductImageCell`

- [ ] **Step 1:** Mount Fluent `<Tooltip>` pas na `pointerenter` (of vervang door native `title`
      tot hover). Geen Tooltip-portal op elke gemounte rij.
- [ ] **Step 2:** Unit/RTL-test of smoke: Tooltip niet in DOM vóór hover.
- [ ] **Step 3:** Commit: `perf: lazy Tooltip mount product image cell #AB:254`

### Task B2: Directional overscan

- [ ] **Step 1:** Breid `useBoardRowWindow` uit: onthoud laatste scroll-delta; asymmetrische
      overscan (meer in scrollrichting, minder tegengesteld). Default totaal ≈ huidig budget
      na A1 (8), bv. 10 vooruit / 4 terug — exacte constanten als named exports.
- [ ] **Step 2:** Tests voor richting wisselen.
- [ ] **Step 3:** Commit: `perf: directional overscan in useBoardRowWindow #AB:254`

### Task B4: GPU-layer op bestaande sticky cellen

- [ ] **Step 1:** Op cellen/headers die al `position: sticky` + `stickyLeft` hebben: voeg
      `transform: 'translateZ(0)'` (of equivalente token-safe compositing-hint) toe.
      **Geen** wijziging aan sticky-selectie/UX.
- [ ] **Step 2:** Visueel bij zoom 100%, 125%, 150% — sticky alignment OK.
- [ ] **Step 3:** Commit: `perf: GPU layer promotion op sticky board cellen #AB:254`

### Task B1: `useBoardColumnWindow` — horizontale kolom-virtualisatie

**Interfaces:**
- Create: `src/hooks/useBoardColumnWindow.js` + `.test.js`
- Consumes: scroll-container horizontale `scrollLeft`, kolombreedtes (gemeten of vaste layout),
  sticky keys (altijd gemount).
- Produces: `{ start, end, leftPadPx, rightPadPx, visibleColumnKeys }` — sticky kolommen altijd
  in de zichtbare set; spacers houden totale breedte.

**Constraints:**
- Header-rij en body-rijen gebruiken **dezelfde** window-state (één hook-eigenaar hoger in de boom,
  props doorgeven) — voorkomt misalignment.
- Collapsed columns, product-image kolom, selection/controls-kolom: altijd gemount of expliciet
  buiten windowing.
- Geen shotgun: wijzigingen beperken tot board table/header/row cell-map; geen unrelated refactors.

- [ ] **Step 1:** Failing tests voor window-berekening + sticky altijd zichtbaar.
- [ ] **Step 2:** Implementeer hook.
- [ ] **Step 3:** Integreer in `PurchaseOrdersBoardTable` / header / rows — één gedeelde range.
- [ ] **Step 4:** AC: geen header/body misalignment bij horizontaal scrollen; ~60% minder
      cel-renders bij 10 zichtbaar van 25 (meetbaar via count of React profiler note in rapport).
- [ ] **Step 5:** Commit: `perf: horizontale kolom-virtualisatie useBoardColumnWindow #AB:254`

### Task B5: Meting Tier B

- [ ] **Step 1:** 20× J4 same-instance; doel `maxLongFrameMs ≤ 700ms`.
- [ ] **Step 2:** Rapport + comment op #254. Als nog > 700ms → vraag go voor Tier C (#255);
      implementeer Tier C **niet** automatisch.
- [ ] **Step 3:** Versie PATCH-bump.

---

## Story #255 — Tier C: paint-then-hydrate / idle cells (GEPARKEERD)

**Status:** geparkeerd. Geen code tot expliciete go van de gebruiker ná Tier-B-meting.

**Conditie (uit DevOps, aangescherpt):** alleen starten als mediaan `maxLongFrameMs` na Tier B
nog **> 700ms** (same-instance, 20 runs, J4) én gebruiker akkoord geeft.

**Dan pas (outline, niet bouwen nu):**
- C1: paint-then-hydrate — lichte skeleton/placeholder rows binnen bestaand data-pad
  (geen claim op Lighthouse FCP 100ms zolang volledige PO-fetch synchroon blijft; herdefiniëren
  naar “first meaningful board chrome ≤ 100ms na data-ready” of data-fetch parallel trekken).
- C2: `requestIdleCallback` voor niet-kritieke cel-content; AC: geen zichtbare pop-in bij
  normale scrollsnelheid.

---

## Afronding Feature #252

- [ ] PR vanaf `feature/252-po-board-scroll-optimalisaties` → `develop` (niet direct `main`).
- [ ] `/perf-check` of `perf-scroll` regressie gedocumenteerd.
- [ ] DevOps comments op #252/#253/#254 met meetcijfers.
- [ ] `docs/devops/252-po-board-scroll-optimalisaties.md` synchroon houden met dit plan.

---

## Self-review notes

- Spec/DevOps-dekking: A0–A4, B0–B5, C geparkeerd — open knopen uit review weggenomen.
- Geen SQL/migratie.
- Performance-chokepoints: `measure('board:window-update')` bij rAF; kolom-window updates
  eveneens `measure('board:column-window-update')` wanneer B1 landt.
- UI: geen nieuwe Tooltip in `.map()` zonder lazy mount (B3).
