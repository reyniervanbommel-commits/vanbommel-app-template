# perf-scroll — reference

## Playwright selectors (PO board)

| Element | Selector |
|---------|----------|
| Scroll container | `div` with computed `overflow-y: auto` wrapping board rows — eerste match onder main na board load |
| Expand rij | `[aria-label^="Expand order"]` of chevron in eerste data-rij |
| Board ready | Zelfde als scout: `Last refreshed`, `No purchase orders found`, `[aria-label^="Select order"]` |

## Console parsing

| Prefix | Gebruik |
|--------|---------|
| `[perf] longframe` | `duration`, `blocking` — tel tijdens scrollvenster |
| `[perf] interaction` | `event: wheel` / `pointer` — `total` >100 ms |
| `[perf] measure` | Client-blokken (`board:rows`, …) |

## Drempels (default — override via policy)

| Metric | Skip als | Target reductie |
|--------|----------|-----------------|
| `maxLongFrameMs` | ≤80 ms | 30% |
| `scrollStableMs` | ≤150 ms | 25% |
| `expandStableMs` | ≤200 ms | 25% |

## Backlog item shape (J4)

```json
{
  "id": "BL-004",
  "journey": "J4",
  "action": "PO board vertical scroll (wheel)",
  "profile": "L",
  "maxLongFrameMs": 120,
  "scrollJankMs": 340,
  "scrollStableMs": 180,
  "dominantPost": "render",
  "targetLongFrameMs": 84,
  "routeFrequencyWeight": 3,
  "priorityScore": 108,
  "status": "open"
}
```

## Adversary (scroll)

Na scroll-fix, `perf-adversary` scenario **A6** (optioneel, warning): snelle opeenvolgende scroll + filter wijziging — geen stale row heights.
