# Perf Optimize — Reference

## Tier implementation checklist

### L0 — Instrumentation

- [ ] Wrap backend block in `time('label', () => …)` 
- [ ] Wrap client block in `measure('label', () => …)`
- [ ] Label naam uit `perf-review/reference.md` inventaris
- [ ] Geen gedragswijziging

### L1 — Micro

- [ ] `useMemo` voor dure afgeleide data
- [ ] `useCallback` voor handlers in JSX (geen inline functions)
- [ ] `React.memo` op list/grid child components
- [ ] Max 4 JSX nesting niveaus behouden

### L2 — SQL

- [ ] Idempotent migratie `scripts/db/migrations/00N_<naam>.sql`
- [ ] `IF NOT EXISTS` voor index/kolom
- [ ] Query plan: seek vs scan
- [ ] Rij-count bewust (paginering vs index)

### L3 — Cache

- [ ] Revision-based invalidation (`tb_revision`)
- [ ] Cross-page: cache blijft bij PO → andere route → PO
- [ ] User-scoped cache keys
- [ ] Supplier scope in cache key
- [ ] Geen localStorage als bron van waarheid (SQL/cache in memory/session)

### L4 — API / dedupe

- [ ] Identify duplicate `tableDataService.read()` calls
- [ ] Request coalescing / shared promise
- [ ] `Promise.all` voor onafhankelijke parallelle calls
- [ ] Payload size check (geen MB responses)

### L5 — Structure

- [ ] Component < 300 regels (split indien nodig)
- [ ] Virtualisatie voor lange PO-lijsten
- [ ] Lazy load heavy subtrees
- [ ] Meet op profiel L vóór als done te markeren

## Common fix patterns (v1 journeys)

| Journey | Known issue | Typical tier |
|---------|-------------|--------------|
| J1 board-load | Render + SQL stacked | L2 → L3 → L5 |
| J2 RCCP | Duplicate `rccp_po_read` | L4 |
| J3 return board | 2× PO read after RCCP | L3 → L4 |

## Files often touched

| Area | Path |
|------|------|
| Table data | `server/services/TableDataService.js` |
| RCCP | `server/services/RccpAnalysisService.js` |
| Board UI | `src/components/bi/BoardSplitView.jsx` |
| Data hooks | `src/hooks/useTableData*.js` |
| Timing | `server/utils/timing.js`, `src/utils/perf.js` |

## Commit message format

```
perf: dedupe PO read on return from RCCP [BL-003 tier L4]

- Shared read promise in TableDataService
- Revision invalidation unchanged
- Blast radius: J1, J3
```
