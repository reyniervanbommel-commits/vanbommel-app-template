# Perf Architect — Reference

## Beslisboom v2 (diagram)

```
elapsedWall, apiSum, app
        │
        ├─ gapRender ≥ 400ms? ──YES──► R (render) ──► L1 → L5
        │
        ├─ gapNetwork ≥ 200ms? ──YES──► N (network) ──► L3 → L4
        │
        ├─ app ≥ 300ms? ──YES──► S (server/SQL) ──► L0 → L2 → L3
        │
        └─ else ──► C (client calc) ──► L1
```

## Fix tiers (L0–L5)

| Tier | Scope | Risico | Voorbeelden |
|------|-------|--------|-------------|
| **L0** | Instrumentatie | Geen | `time('tb_read_sql', …)`, `measure('board_build', …)` |
| **L1** | Micro-optimalisatie | Laag | `useMemo`/`useCallback`, kleine conditional render |
| **L2** | SQL/query | Medium | Index toevoegen, `SELECT` kolommen, paginering |
| **L3** | Cache | Medium–hoog | Session cache, revision invalidation, cross-page unlimited per policy |
| **L4** | API/dedupe | Hoog | Merge duplicate `tableDataService.read()`, `Promise.all` |
| **L5** | Structuur | Zeer hoog | Virtualisatie grid, lazy routes, component split (>300 regels eerst splitsen) |

## Cache policy (product-owner Q6)

```json
{
  "crossPageTtlPolicy": "unlimited-until-revision",
  "requireRevisionInvalidation": true
}
```

Implementatie-regels voor L3:

- PO board cache **mag blijven** bij navigatie PO → BI → PO
- **Invalidate** bij revision change (`tb_revision`) of expliciete refresh
- **Nooit** supplier-scope lekken via gedeelde cache keys

## Dominante post → tier start

| dominantPost | Eerste tier |
|--------------|-------------|
| `render` | L1 (escalate L5) |
| `network` | L3 |
| `sql` / `server` | L2 |
| `client` | L1 |
| `unknown` | L0 (instrumenteer eerst) |

## Fix-plan schema

Zie `test-reports/schemas/perf-fix-plan.schema.json`.

## Code-locaties ( veelvoorkomend )

| Label / gebied | Bestand |
|----------------|---------|
| `tb_read_*`, `tb_ledger` | `server/services/TableDataService.js` |
| `rccp_po_read` | `server/services/RccpAnalysisService.js` |
| Board render | `src/components/bi/BoardSplitView.jsx` |
| API client | `src/utils/api.js` |
| Route analytics | `src/hooks/useRouteAnalytics.js` |
