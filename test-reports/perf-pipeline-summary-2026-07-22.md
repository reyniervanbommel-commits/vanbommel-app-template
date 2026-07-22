# Perf Pipeline Summary — 2026-07-22

**Run:** `perf-2026-07-22T0920Z` · `runMode: full`
**Branch:** `cursor/e33c3a6a`
**App version:** v1.30.34 → **v1.30.35**
**Status:** `paused` — lokale verify groen; push + preview-deploy + Azure her-meting wachten op goedkeuring/credentials.

## Meetomgeving

- **Truth:** Azure DEV Container App (scout).
- **Lokale verify:** vite dev-build → Azure DEV backend via proxy (`VITE_PROXY_STRIP_SECURE`), zodat een lokale codewijziging vóór deploy meetbaar is. Dev-build+proxy = ~4× hogere absolute waarden dan Azure; relatieve voor/na is geldig.

## Scout-bevindingen (Azure DEV)

| Journey | Metric | Waarde | Actie |
|---------|--------|-------:|-------|
| J1 board-load | elapsedWall | 178 ms | skip (< 500 ms) |
| J2 /rccp | elapsedWall | null | skip (ruis) |
| J3 terugkeer / | elapsedWall | null | skip; duplicate PO-fetch = 0 (v1.3 cache intact) |
| J4 scroll | longframe | — | skip (geen overflow-container op dataset) |
| J7 filter Apply | filterApplyMs | 404 (M) / 572 (L) | al geoptimaliseerd; binnen ruis → skip |
| J8 text style Bold | textStyleApplyMs | 891 (M) / 799 (L) | **fix** (BL-006) |

## Iteraties

| Iteratie | Item | Tier | Resultaat |
|---------:|------|------|-----------|
| 1 | BL-006 (comparator per-kolom) | L1 | geen winst — tweede render-golf dominant |
| 2 | BL-006 (+ network-only text-style persist) | L1 | **PASS lokaal** — J8 ~2941 → ~1880 ms (~36%) |

## Code-fixes BL-006 (render, R-tak)

1. `boardColumnSettings.js` — `normalizeColumnTextStyleMap(rawStyles, allowedKeys, previous)`: ongewijzigde kolom-stijlen behouden referentie.
2. `usePurchaseOrdersPage.js` — ref-cache voor `effectiveHeaderColumnTextStyles`; `persistBoardSettings({applyState})` → gecoalesceerde text-style-persist draait network-only (geen setter-blast/tweede golf).
3. `PurchaseOrderBoardRow.jsx` — `PurchaseOrderBoardCell` `arePropsEqual`: `formatting` per-kolom vergeleken; cellen van niet-gewijzigde kolommen slaan re-render over.
4. `version.js` — v1.30.35.
5. `vite.config.js` — env-gated proxy Secure/Domain-strip (lokale perf-meting; standaard inert).

## UX-winst (gemeten, lokale harnas)

| Journey | Metric | Voor | Na | Δ |
|---------|--------|-----:|---:|--:|
| **J8** | textStyleApplyMs | 2941 | ~1880 | **≈ −36%** |
| J7 | filterApplyMs (blast) | 830 | ~825 | geen regressie |

Unit tests: **35/35 pass**.

## Verify / gates

- Primaire gate (textStyleApplyMs −30%): **gehaald** op lokale harnas.
- Regressie J7: geen.
- Adversary A1/A5: niet-blokkerend voor L1 render-tak (geen cache/dedup-semantiek gewijzigd; PATCH stuurt nog volledige settings, persist over reload intact).

## Open / vervolg

| Onderwerp | Note |
|-----------|------|
| Azure DEV bevestiging | Deploy preview + her-meting J8 op geminificeerde build |
| Push + draft PR | Wacht op goedkeuring (git-regel: `prReview: always-human`) |
| Seed / scroll (J4) | DEV-dataset heeft geen overflow; seed M/L nodig voor scroll-meting |

## Artifacts

- `perf-backlog.json`, `perf-baseline.json`, `perf-pipeline-state.json`
- `perf-review-2026-07-22.md`, `perf-board-actions-2026-07-22.md`
- `perf-fix-plan-BL-006.json`, `perf-verify-BL-006.md`
- `perf-user-report-2026-07-22.md`
