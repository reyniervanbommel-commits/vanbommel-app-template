# Perf scroll — vergelijking DEV vs feature/252 — 2026-08-13

Beide metingen: 20 runs, profiel L, J4-journey (PO board verticaal scrollen), headless Chromium, Azure Container Apps.

## Omgevingen

| | DEV (`develop`) | Feature (`feature/252`) |
|---|---|---|
| URL | vendorportal-dev.graysand-65442c41.northeurope.azurecontainerapps.io | preview-po-board-scroll-opti.graysand-65442c41.northeurope.azurecontainerapps.io |
| Branch | `develop` (zonder rAF-gate, zonder Tier A/B) | `feature/252-po-board-scroll-optimalisaties` |
| Gemeten om | 17:30 UTC | 17:14 UTC |

## Resultaten (mediaan, 20 runs)

| Metric | DEV | Feature/252 | Delta | % |
|--------|----:|------------:|------:|--:|
| **maxLongFrameMs** | 982 | **767** | −215 | **−21,9%** |
| **scrollJankMs** | 3893 | **818** | −3075 | **−79,0%** |
| scrollStableMs | 400 | 400 | 0 | — |
| **slowInteractionCount** | 0 | 0 | 0 | — |
| **longframeCount** | 18 | **3** | −15 | **−83,3%** |

## Conclusie

- **scrollJankMs −79%**: het cumulatieve janktijd per sessie is van 3,9s naar 0,8s gedaald — de sterkste verbetering.
- **longframeCount −83%**: van 18 lange frames naar 3 per scroll-sessie. Het bord scrollt aantoonbaar vloeiender.
- **maxLongFrameMs −22%** (982 → 767ms): het langste afzonderlijke frame is verbeterd maar nog boven het Tier-B-doel van 700ms.

### Doel vs resultaat

| Doel | Target | Behaald |
|------|-------:|--------:|
| Tier A doel (≤ 800ms) | 800 | ✅ 767ms |
| Tier B doel (≤ 700ms) | 700 | ❌ 767ms (+67ms) |

### Noot: Tier C-drempel

Het plan bepaalt: *"Tier C alleen als na Tier B maxLongFrameMs > 700ms"*.
Huidige stand: 767ms > 700ms → Tier C is formeel getriggerd.
Beslissing hierover ligt bij de gebruiker (Tier C staat op GEPARKEERD in #255).

## Geïmplementeerde items (feature/252)

| Item | Omschrijving | Status |
|------|------|--------|
| A0 | rAF-gate hersteld in `useBoardRowWindow` | ✅ |
| A1 | Overscan 14 → 8 | ✅ |
| A2 | `content-visibility: auto` op tabelrijen | ✅ (was al aanwezig) |
| A3 | `React.startTransition` rond `setRange` | ✅ |
| A4 | `contain: layout` op tabelcellen | ✅ |
| B0 | `PurchaseOrderBoardRow.jsx` gesplitst (< 300 regels) | ✅ |
| B1 | `useBoardColumnWindow` horizontale kolom-virtualisatie | ✅ |
| B2 | Directional overscan (4 voor, 8 achter scrollrichting) | ✅ |
| B3 | Tooltip hover-only mount (200ms delay) | ✅ |
| B4 | GPU `translateZ(0)` op `controlCell` (sticky-left) | ✅ |
| Fix | Group header: `transform` verwijderd van `groupRowCell` | ✅ |
| Fix | `useBoardColumnWindow`: correcte `headerColumnWidths` bron | ✅ |
| C1–C2 | Paint-then-hydrate / requestIdleCallback | GEPARKEERD (#255) |
