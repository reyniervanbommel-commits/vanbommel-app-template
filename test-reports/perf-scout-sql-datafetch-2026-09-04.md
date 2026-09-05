# Perf scout — SQL data-ophaal & caching (2026-09-04)

**Modus:** scout-only (geen fixes, geen commit, geen push)
**Omgeving:** Azure DEV Container App, huidige dataset (géén seed — DEV-data niet gewist)
**App-versie:** v1.54.10
**Primaire metric:** `elapsedWall` (ervaren snelheid), conform policy

## Aanleiding

Vermoeden: het ophalen van data uit MSSQL kan ≥30% sneller. Vooronderzoek in de code wees op
5 punten (pool-config, board-read cache, index-dekking, bulk-update, client-dedup). Deze scout
toetst dat vermoeden aan metingen vóórdat er iets wordt gebouwd.

## Meetresultaten

### Journeys (mediaan 3×, Playwright)

| Journey | Actie | `elapsedWall` | `app` | Dominant |
|---|---|---:|---:|---|
| J1 | Board-load `/` | **85 ms** | 1.809 ms | server |
| J2 | Route `/rccp` | — | **21.497 ms** | sql |
| J3 | Terugkeer `/` | — | 0 ms | — (0 duplicate PO-fetches) |

### Directe endpoint-meting (curl + Server-Timing)

| Endpoint | koud | warm |
|---|---:|---:|
| `/api/rccp/board-kpis` | **18.245 ms** | **8–13 ms** |
| `/api/rccp/vendors` | 562 ms | — |
| `/api/rccp/capacity` | 6 ms | — |

Breakdown van de koude `board-kpis` (18.245 ms):

```
kpi_po_read                          17.239 ms   (95%)
├─ tb_read_details                    7.916 ms
├─ tb_lookups                         5.844 ms
│  ├─ tb_lookup_pav_pivot             5.143 ms
│  └─ tb_lookup_product_receipt_lines 4.560 ms
├─ tb_build_rows                      4.029 ms   (CPU, geen SQL)
└─ tb_read_cols/revision/sync/custom  ~4.400 ms
```

### Infrastructuur

| Container App | minReplicas | maxReplicas | Gemeten |
|---|---:|---:|---|
| `vendorportal-dev` | **0** | 2 | cold start **23,98 s**, warm 0,11 s |
| `vendorportal-prod` | 1 | **1** | geen cold start; **geen scale-out** |

## Conclusies

1. **De oorspronkelijke aanname klopt niet.** De board-load is niet traag: 85 ms ervaren
   (was 178 ms in juli). De 1,8 s servertijd zit volledig verborgen achter de cache. Een
   30% snellere SQL levert daar ~0 ms merkbare winst op.

2. **Het echte probleem is de koude cache op het RCCP-pad**: 18,2 s koud vs 8–13 ms warm —
   factor ~1.400×.

3. **Oorzaak is een TTL die in strijd is met de vastgelegde policy.**
   `BoardSnapshotCache.js:13` hanteert `SNAPSHOT_TTL_MS = 5 min` en `liveCache()` (regel 26)
   verwerpt de cache na die 5 minuten óók als de content-signatuur ongewijzigd is. De policy
   (`perf-optimize-policy.json`, Q6) stelt: `crossPageTtlPolicy: "unlimited-until-revision"`,
   `requireRevisionInvalidation: true`. De signatuur-invalidatie die dit hoort te regelen is
   al aanwezig (regel 73 en 107). De TTL is een restant.

4. **Slechts 1,7 s van de 21,5 s J2-servertijd is als `sql` geclassificeerd**; de rest is
   lookup-I/O en CPU (`tb_build_rows`). De vijf punten uit het oorspronkelijke plan raken dus
   een minderheid van het probleem — ze worden pas relevant ná punt 3, om de achtergrond-
   refresh en de eerste load na een datawijziging goedkoper te maken.

## Backlog-items

| ID | Item | Status |
|---|---|---|
| BL-007 | RCCP koude snapshotcache — TTL vs policy | open (hoogste waarde, kleinste ingreep) |
| BL-008 | DEV cold start (minReplicas 0) + PROD zonder scale-out | open |
| BL-009 | Kosten van de koude read zelf (read_details / lookups / build_rows) | open |

## Niet gedaan

- Geen seed uitgevoerd: `scripts/seed-perf-po-cache.js` doet
  `DELETE FROM dbo.tb_cache WHERE table_id = @tableId` op de gedeelde DEV-database. Met werk
  onderhanden is dat niet ongevraagd uitgevoerd. Gevolg: cijfers zijn niet 1-op-1 vergelijkbaar
  met de opgeslagen profielen M/L uit juli, maar wél representatief voor de echte dataset.
- Geen code-wijziging, geen commit, geen push.
