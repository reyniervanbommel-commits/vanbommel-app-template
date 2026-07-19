# Perf Review — referentie

Technische bijlage bij `SKILL.md`. Bevat de meetsnippets, de labelinventaris en de rekenregels.

---

## 1. Meten

### Hoofdweg — console (werkt overal)

De observers zitten al in `src/utils/perf.js` en installeren zichzelf in dev/preview. Lees ze met
`browser_console_messages`; er is geen opstart-call nodig.

```
[perf] interaction {"event":"click","target":"BUTTON.fui-Tab","text":"Purchase orders",
                    "total":1180,"inputDelay":8,"processing":740,"render":432}
[perf] longframe    {"duration":520,"blocking":470,"scripts":[{"ms":460,"source":"…/board.js:buildRows"}]}
[perf] navigation   {"url":"/bi","ttfb":180,"domContentLoaded":940,"load":1620,"resourceKB":880}
[perf] measure board:process → 310ms
[api]  GET /table/rows → 200 in 870ms
```

Lezen: `processing` hoog → JS-werk (client-berekening). `render` hoog → React commit + paint.
Drempel is 100 ms (`SLOW_INTERACTION_MS` in `perf.js`) — een stille console betekent snel genoeg.

### Uitleesweg met evaluate-tool

Alleen als je JS in de pagina kunt uitvoeren. Preciezer dan console-parsen:

```js
window.__perf.reset();       // vóór de interactie
window.__perf.timings();     // ná: [{ method, path, status, ms, at }, …]
window.__perf.navigation();  // { ttfb, domContentLoaded, load, transferKB }
window.__perf.resourceKB();  // totale JS/CSS-transfer
window.__perf.dump('tab-x'); // alles als één [perf] dump-regel in de console
```

Entries met `method: 'ui'` zijn `measure()`-blokken (client-berekening), de rest zijn
`apiRequest`-calls. Buffer is max 40 entries — altijd resetten vóór de meting.

### De observers zelf (ter referentie)

Dit draait al in de app; hieronder staat wat er gemeten wordt, voor als je het handmatig
in een console wilt herhalen of de drempel wilt verlagen.

```js
window.__perfEvents = [];
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    window.__perfEvents.push({
      name: e.name,                                   // 'click', 'keydown', …
      target: e.target?.tagName + '.' + (e.target?.className || ''),
      total: Math.round(e.duration),                  // klik → volgende paint
      inputDelay: Math.round(e.processingStart - e.startTime),
      processing: Math.round(e.processingEnd - e.processingStart),  // JS-handlers
      render: Math.round(e.startTime + e.duration - e.processingEnd),
    });
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 100 });
```

### Blokkerende scripts — welke regel code

```js
window.__perfLoaf = [];
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    window.__perfLoaf.push({
      duration: Math.round(e.duration),
      blocking: Math.round(e.blockingDuration),
      scripts: e.scripts.map((s) => ({
        dur: Math.round(s.duration),
        source: s.sourceURL + ':' + s.sourceFunctionName,
      })),
    });
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

Niet in elke browser beschikbaar (Chromium-only). Ontbreekt het, val terug op `longtask` — die
geeft wel de duur maar niet de bron. In dat geval is de `render`-post uit de interactie-regel
je enige aanwijzing, en is modus `drilldown` eerder nodig.

### Server-Timing uitlezen

Via `browser_network_requests`, of programmatisch:

```js
performance.getEntriesByType('resource')
  .filter((r) => r.serverTiming?.length)
  .map((r) => ({
    url: r.name.split('/').slice(-2).join('/'),
    total: Math.round(r.duration),
    server: Object.fromEntries(r.serverTiming.map((s) => [s.name, Math.round(s.duration)])),
  }));
```

> `serverTiming` is alleen zichtbaar als de respons `Timing-Allow-Origin` toestaat, of same-origin is.
> Bij een cross-origin preview-URL zonder die header krijg je een lege array — noteer als meetgat.

---

## 2. Labelinventaris (backend)

De `time()`-labels die de Server-Timing-header vullen, en waar ze vandaan komen:

| Label | Bestand | Wat |
|-------|---------|-----|
| `app` | `server/server.js` (middleware) | Totale request-tijd — altijd aanwezig |
| `tb_read_sql` | `server/services/TableDataService.js` | Hoofdquery van het board |
| `tb_read_cols` | idem | Kolom-metadata |
| `tb_links`, `tb_lookups` | idem | Relaties en lookup-resolutie |
| `tb_ledger`, `tb_revision`, `tb_history_hints` | idem | Historie/mutatie-lagen |
| `tb_meta`, `tb_sync_state`, `tb_viewed`, `tb_track_marks` | idem | Metadata rond het board |
| `tb_retention` | idem | Opschoning |
| `bi_meta`, `bi_aggregate` | `server/routes/bi.js` | BI-metadata en aggregatie |
| `rccp_po_read`, `rccp_capacity`, `rccp_vendor_list` | `server/services/RccpAnalysisService.js` | RCCP-analyse |
| `remarks_list_sql`, `remarks_activity` | `server/services/RowRemarksService.js`, `RowActivityService.js` | Opmerkingen/activiteit |

Alles buiten deze lijst valt in **backend-overig** en is per definitie ongemeten.

---

## 3. Rekenregels (toerekening)

Per actie, met `T` = interactie-duur uit Event Timing (of `load` bij een paginalading):

```
SQL              = som van alle time()-labels in de Server-Timing-headers van deze actie
Backend-overig   = som van alle `app`-waarden − SQL
Netwerk          = som van apiRequest-duren (window.__perf.timings(), method ≠ 'ui') − som van `app`
Client-berekening= som van measure()-entries (method === 'ui')
Render           = T − (som van apiRequest-duren) − Client-berekening
```

Kanttekeningen die je in het rapport moet noemen als ze spelen:

- **Parallelle calls.** Draaien calls via `Promise.all`, dan is de som hoger dan de wandkloktijd
  en wordt `Render` kunstmatig negatief. Gebruik dan de langste call in plaats van de som, en
  vermeld dat de actie parallelliseert.
- **Negatieve restpost.** Altijd een teken dat er dubbel geteld wordt (parallellisme) of dat de
  buffer entries van een vórige actie bevat. Reset en meet opnieuw.
- **`measure()`-blokken zitten soms ín een apiRequest.** Dan tel je dubbel; controleer de
  timestamps (`at`) op overlap.

---

## 4. SQL-diagnose

Er is geen ad-hoc query-runner in de repo. Schrijf een wegwerp-script in de scratchpad (niet in
de repo) dat de bestaande pool hergebruikt:

```js
// scratchpad/perf-query.js
const { getSqlPool } = require('../server/utils/sqlPool');
(async () => {
  const pool = await getSqlPool();
  await pool.request().query('SET STATISTICS IO ON; SET STATISTICS TIME ON;');
  const r = await pool.request().query('<de query uit het dominante label>');
  console.log(r.recordset.length, 'rijen');
  process.exit(0);
})();
```

Controleer in deze volgorde:

1. **Rijaantal.** `SELECT COUNT(*)` op de betrokken tabellen. Zet de duur af tegen het volume.
2. **Uitvoeringsplan.** `SET SHOWPLAN_ALL ON` vóór de query, of in SSMS. Zoek `Table Scan` /
   `Clustered Index Scan` op grote tabellen waar een `Seek` hoort.
3. **Ontbrekende indexen.**
   ```sql
   SELECT TOP 20 mid.statement, migs.avg_total_user_cost * migs.avg_user_impact AS impact,
          mid.equality_columns, mid.inequality_columns, mid.included_columns
   FROM sys.dm_db_missing_index_groups mig
   JOIN sys.dm_db_missing_index_group_stats migs ON migs.group_handle = mig.index_group_handle
   JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
   ORDER BY impact DESC;
   ```
   Behandel dit als hint, niet als opdracht — een index kost schrijftijd.
4. **Duurste queries app-breed.**
   ```sql
   SELECT TOP 20 qs.total_elapsed_time / qs.execution_count / 1000 AS avg_ms,
          qs.execution_count, SUBSTRING(qt.text, 1, 300) AS query
   FROM sys.dm_exec_query_stats qs
   CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
   ORDER BY avg_ms DESC;
   ```

Antipatronen om op te letten in de querycode zelf: `SELECT *` waar een kolomselectie volstaat,
ontbrekende `WHERE` op tenant/vendor, joins over de volledige `tb_cache`, geen paginering,
en `$select` dat niet doorwerkt richting D365 (dat is eerder stukgegaan — zie DevOps #185).

---

## 5. React `<Profiler>` (modus drilldown)

Tijdelijk om de verdachte subtree:

```jsx
import { Profiler } from 'react';
import { recordApiTiming } from '../utils/perf';

<Profiler
  id="board"
  onRender={(id, phase, actualDuration) =>
    recordApiTiming({ method: 'ui', path: `render:${id}:${phase}`, status: 0,
                      ms: Math.round(actualDuration), at: Date.now() })
  }
>
  <BoardSplitView />
</Profiler>
```

De metingen landen in dezelfde buffer, dus `window.__perf.timings()` laat ze meelopen.
`phase` is `mount` of `update` — een dure `update` bij een tab-switch is precies het signaal
dat je zoekt.

**Weghalen na afloop**, tenzij het een blijvende hotspot bleek. Profiler-instrumentatie kost
zelf tijd en vertekent latere metingen.
</content>
