# Perf Verify — BL-006 (J8 text style Bold) — 2026-07-22

**Fix-plan:** `perf-fix-plan-BL-006.json` · tier **L1** (render, R-tak)
**Run:** `perf-2026-07-22T0920Z` · iteraties 1-2

## Wijziging (lokaal, nog niet gecommit)

1. `src/utils/boardColumnSettings.js` — `normalizeColumnTextStyleMap` krijgt optionele `previous`-param; ongewijzigde kolom-stijlen behouden hun object-referentie.
2. `src/hooks/usePurchaseOrdersPage.js` —
   - `effectiveHeaderColumnTextStyles` gebruikt een ref-cache zodat per-kolom referenties stabiel blijven tussen renders.
   - `persistBoardSettings` krijgt optie `{ applyState }`; de gecoalesceerde text-style-persist draait **network-only** (`applyState:false`) zodat de setter-blast (tweede render-golf) wegvalt.
3. `src/components/supplier/PurchaseOrderBoardRow.jsx` — `PurchaseOrderBoardCell` krijgt `arePropsEqual`: vergelijkt `formatting` alleen op de per-kolom slices; overige props strikt (Object.is).
4. `src/config/version.js` — v1.30.34 → v1.30.35.
5. `vite.config.js` — env-gated (`VITE_PROXY_STRIP_SECURE`) proxy-hook die Secure/Domain uit Set-Cookie strip, zodat de lokale dev-frontend tegen de HTTPS Azure DEV-backend kan meten. Standaard inert.

## Lokale verify

| Check | Resultaat |
|-------|-----------|
| Unit tests (3 files, 35 tests) | **PASS** (incl. "past text style direct op bij toggle bold") |
| J8 textStyleApplyMs — baseline | 2941 ms |
| J8 na iteratie 1 (alleen comparator) | 3331 ms (geen winst — tweede golf dominant) |
| **J8 na iteratie 2 (+ network-only persist)** | **1938 / 1821 ms** (2 runs) |
| J7 filterApplyMs (blast radius) | 830 → 843 / 805 ms — ongewijzigd |

**Winst J8:** ~2941 → ~1880 ms = **≈ 36% sneller** (median van 3× per run, 2 runs bevestigd).

**Meetweg:** lokale vite dev-build → Azure DEV backend via proxy (`VITE_PROXY_STRIP_SECURE`). Dev-build + http-proxy heeft veel overhead; absolute waarden ~4× hoger dan de geminificeerde Azure-build, maar de **relatieve** voor/na-vergelijking op dezelfde opstelling is geldig.

## Verdict: **PASS op lokale harnas** (≥30% reductie textStyleApplyMs, J7 geen regressie)

**Kanttekening:** de truth-omgeving is Azure DEV (geminificeerde build). Deze meting bevestigt de winst op de dev-build+proxy; definitieve bevestiging vereist een preview-deploy + her-meting op Azure DEV.

## Adversary (A1/A5)

Tier L1 render-fix; A1/A5 zijn niet-blokkerend voor deze tak. De change raakt geen cache-/dedup-semantiek: de text-style-PATCH stuurt nog steeds het volledige `settings`-object (persist over reload intact), en de foutafhandeling in het gecoalesceerde pad is ongewijzigd t.o.v. de bestaande code.
