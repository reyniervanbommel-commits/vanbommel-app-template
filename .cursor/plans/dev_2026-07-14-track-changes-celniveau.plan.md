# Track changes op celniveau (sessie/week-streepjes)

## 1. Doel & scope

Per kolom (admin) aanzetbare "track changes": onderin elke cel max. 5 streepjes die tonen in welke sessie(s) of week/weken de cel is gewijzigd. Globaal gedeeld, generiek voor alle `tb_*`-boards. Granulariteit (per sessie / per week, ma–zo) instelbaar op een nieuwe Settings-tab. Bij sessie-modus tellen alleen logins van een instelbare groep gebruikersrollen mee (default: intern personeel), zodat "een sessie" een betekenisvol venster blijft.

**v1-scope:** alleen **custom `tb_`-kolommen** worden getrackt (bron `tb_cell_history`). D365-kolommen volgen als aparte vervolg-story (zie §9).

### User story

**Als** beheerder/inkoper
**wil ik** per kolom kunnen zien in welke recente sessies of weken een cel is gewijzigd
**zodat** ik snel recente wijzigingspatronen herken zonder de volledige celhistorie te openen.

### Acceptatiecriteria (definitie van "klaar")

1. Een admin kan per kolom track-changes aan/uit zetten via een menu-item in de kolomheader; niet-admins zien die toggle niet.
2. Op de Settings-tab "Track changes" is de granulariteit instelbaar: **Per sessie** of **Per week (ma–zo)**, globaal actief voor alle boards.
3. In sessie-modus is instelbaar **welke gebruikersrollen** een sessie starten (multi-select uit `admin` / `employee` / `supplier`; default `admin` + `employee`). Alleen een login van een gekozen rol maakt een nieuwe sessie aan.
4. Een getrackte, gewijzigde cel toont ≤5 streepjes: **rood** = gewijzigd in die sessie/week, **geel** = afgeronde sessie/week zonder wijziging, **grijs** = lopende/toekomstige sessie/week óf vóór activatie van de kolom.
5. Sessies/weken vóór de `activatedAt` van een kolom blijven grijs (fresh start per kolom).
6. Zonder actieve kolommen draait er geen extra query: de Server-Timing-metric `tb_track_marks` is dan afwezig.
7. Streepjes worden meeberekend in de bestaande parallelle read-stap (geen extra board-round-trip) en zijn kleurenblind-vriendelijk toegankelijk (zie §4.7).

## 2. Performantie-uitgangspunten (leidend)

- **Geen extra board-round-trips.** Streepjes worden meeberekend in de bestaande parallelle `loadHistoryByCell`-stap in `TableDataService.read()` (~regel 2354). Eigen Server-Timing-metric `tb_track_marks` via `time()`.
- **Nul kosten als niets aanstaat.** `loadTrackMarks` wordt alleen aan het `Promise.all`-blok toegevoegd bij ≥1 actieve kolom, met `WHERE column_id IN (…)`. Anders volledig overgeslagen (geen query, metric afwezig).
- **Minimale payload.** Meta één keer (`mode`, per kolom `activeOffset`, `defaultPattern`) + per gewijzigde cel een 5-tekenstring (`"rgyyy"`). Ongewijzigde cellen → niets → client valt terug op `defaultPattern`.
- **1 DOM-node per cel.** Eén `<div>` met CSS `linear-gradient` (5 segmenten), `React.memo`, geen inline handlers. Niet-getrackte kolommen: nul extra render.
- **Sessie-registratie O(1).** Eén conditionele insert per login in de bestaande login-analytics-hook.

## 3. Functioneel gedrag

- **Kleuren:** grijs = lopende/toekomstige sessie of week zonder wijziging (én alles vóór activatie); rood = gewijzigd in die sessie/week; geel = afgeronde sessie/week zonder wijziging.
- Links = oudste, rechts = nieuwste; vult links→rechts, schuift na 5.
- **Week-modus:** buckets = ISO-weken (ma–zo) uit `changed_at`; geen sessie-registratie nodig, `sessionRoles` niet van toepassing.
- **Sessie-modus:** buckets = de laatste 5 sessie-vensters uit `tb_track_change_sessions` (alleen gevuld door logins van de ingestelde `sessionRoles`).
- **Fresh start:** alleen `changed_at ≥ activatedAt` telt; sessies/weken vóór activatie blijven grijs (zie §4.6 voor de per-kolom-offset).

## 4. Architectuur & data

### 4.1 Globale config (admin)

Nieuw endpoint `GET/POST /api/admin/settings/track-changes` (patroon van `settings/odata`, [server/routes/admin.js:269](../../server/routes/admin.js#L269)/`#L298`), opgeslagen als globale setting-JSON:

```json
{
  "mode": "session",
  "sessionRoles": ["admin", "employee"],
  "columns": { "142": { "activatedAt": "2026-07-14T20:00:00Z" } }
}
```

- `mode`: `"session"` | `"week"` — gezet op de Settings-tab.
- `sessionRoles`: array van rollen (`admin` / `employee` / `supplier`) waarvan een login een sessie start. Alleen relevant in sessie-modus. Default `["admin", "employee"]`. Leeg array = geen enkele login start een sessie (feature effectief uit tot een rol is gekozen).
- `columns[columnId]`: aanwezig = aan; `activatedAt` = moment van inschakelen (fresh start). Verwijderd = uit.

Server-side validatie op POST: `mode` ∈ {session, week}; `sessionRoles` ⊆ {admin, employee, supplier}; `columns` een object met ISO-datum-strings. Route achter `requireSession` + `requireRole('admin')` (conform bestaande admin-routes).

### 4.2 Kolom-header toggle (admin-only)

In `PurchaseOrderColumnHeader.jsx` een menu-item "Enable/Disable track changes" met header-indicator volgens het bestaande `showFilterIndicator`-patroon ([regel 73/191](../../src/components/supplier/PurchaseOrderColumnHeader.jsx#L73)), alleen zichtbaar bij de al aanwezige `isAdmin`-prop. Handler → `useTrackChanges`-hook → globale config POST → board herleest streepjes.

### 4.3 Settings-tab "Track changes"

Nieuwe tab in `AdminPage.jsx` + nieuw component `src/components/admin/AdminTrackChangesSettings.jsx` (<300 regels), patroon van `AdminODataSettings.jsx`:
- segmented control **Per session** / **Per week (Mon–Sun)**;
- in sessie-modus: multi-select (checkboxes/`Combobox`) voor `sessionRoles` uit admin/employee/supplier;
- legenda (grijs/rood/geel, met tekstlabel per kleur — niet alleen kleur);
- overzicht van kolommen met tracking aan (naam + `activatedAt`).

Laadt/saved via het endpoint uit 4.1 (`apiRequest`, nooit raw `fetch`).

### 4.4 Sessie-registratie (session-modus)

Migratie `scripts/db/migrations/024_track_change_sessions.sql` (idempotent, globaal — geen `table_id`):

```sql
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='tb_track_change_sessions' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_track_change_sessions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    started_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    triggered_by_role NVARCHAR(16) NULL      -- ter diagnose; welke rol de sessie startte
  );
  CREATE INDEX IX_tb_track_sessions_started ON dbo.tb_track_change_sessions(started_at DESC);
END
```

In de bestaande login-analytics-hook (`server/routes/auth.js`, `recordLoginAnalytics`, na succesvolle login) één **conditionele** insert: alleen wanneer de rol van de ingelogde gebruiker in de geconfigureerde `sessionRoles` zit **én** `mode === 'session'`. De read leest de laatste 5 `started_at` als sessie-grenzen.

- **Gelijktijdige logins:** elke in-aanmerking-komende login is één rij; twee logins vlak na elkaar leveren twee dicht opeenvolgende grenzen op. Door `sessionRoles` te beperken tot intern personeel blijft dit een betekenisvol venster. Geen extra dedup in v1.
- **Retentie:** de read gebruikt `TOP 5 … ORDER BY started_at DESC`; de tabel groeit onbeperkt maar wordt nooit volledig gescand. Optionele opschoning (behoud laatste ~50) is een vervolg-verbetering, geen v1-eis.

### 4.5 Server-side berekening (piggyback op read)

Helper `loadTrackMarks(pool, tableId, enabledColumns, mode, boundaries)` — parallel toegevoegd aan het bestaande `Promise.all`-blok in `read()`, alleen bij ≥1 actieve kolom. Eén query per modus (alleen actieve custom-kolommen uit `tb_cell_history`, `changed_at ≥ activatedAt` per kolom):

- **week:** `DATEDIFF(week, changed_at, SYSUTCDATETIME())` → offset 0..4, direct in SQL `GROUP BY column_id, cel, offset`.
- **session:** bucketing **in SQL** via een `CASE` tegen de ≤5 sessie-grenzen (of een `VALUES`-join van de grenzen), zodat de query per (cel, bucket) één rij teruggeeft — geen ruwe change-rijen naar JS.

Per cel → set rode offsets → server-util → 5-tekenstring, aangehangen als `trackMarksByColumnId` (net als `historyByColumnId`, [TableDataService.js:2476/2508](../../server/services/TableDataService.js#L2476)). Response-meta: `trackChanges: { mode, activeOffsetByColumnId, defaultPattern }` (per kolom omdat `activatedAt` per kolom verschilt, zie §4.6).

### 4.6 Pure util (server-only)

`server/utils/trackChangeMarks.js` (**server-only**; de client heeft géén pattern-logica nodig omdat de server kant-en-klare strings + `defaultPattern` stuurt):

```js
export const MARK_COUNT = 5;
// activeOffset = per-kolom offset waar 'afgerond' (geel) omslaat naar 'vóór activatie' (grijs):
// de boundary-index die op/na activatedAt valt. Alles > activeOffset = grijs.
export function buildMarkPattern(redOffsets, activeOffset, max = MARK_COUNT) {
  const red = new Set(redOffsets);
  const marks = new Array(max).fill('g');
  for (let offset = 0; offset < max; offset += 1) {
    const slot = max - 1 - offset;             // offset 0 = meest rechtse slot
    if (red.has(offset)) marks[slot] = 'r';
    else if (offset === 0) marks[slot] = 'g';         // lopende sessie/week
    else if (offset <= activeOffset) marks[slot] = 'y'; // afgeronde sessie/week zonder wijziging
    else marks[slot] = 'g';                    // vóór activatie/tracking → grijs
  }
  return marks.join('');
}
```

`loadTrackMarks` berekent `activeOffset` **per kolom**: de index van de oudste sessie-/weekgrens die nog op/na `activatedAt` valt. `defaultPattern` (voor ongewijzigde cellen) wordt per kolom afgeleid uit `buildMarkPattern([], activeOffsetVoorDieKolom)`.

### 4.7 Frontend rendering

Nieuw `src/components/supplier/TrackChangeMarks.jsx` (pure, `React.memo`, ~55 regels): 5-tekenstring → één `<div>` met `linear-gradient` onderin, `r`→rood / `g`→grijs / `y`→geel (Fluent-tokens, geen hardcoded hex). Toegankelijkheid: een `title`/`aria-label` op de div ("Gewijzigd in sessie/week …") als niet-kleur-cue — **geen** `Tooltip`-component in de herhaalde cel (UI-Engineer-regel). Geplaatst in `PurchaseOrderDataCell.jsx` (heeft al `position: relative/sticky`, [regel 19-31](../../src/components/supplier/PurchaseOrderDataCell.jsx#L19)) zodat alle kolomtypes gedekt zijn.

Pattern-bron in de cel: `cell.order.trackMarksByColumnId?.[colId] ?? meta.defaultPattern[colId]`; `meta` (mode + defaultPattern + welke kolommen actief) komt binnen via layout/props of een lichte context. Alleen renderen als de kolom actief is.

## 5. Bestanden & regel-budget

| Bestand | Actie | ~regels |
|---|---|---|
| `scripts/db/migrations/024_track_change_sessions.sql` | nieuw | 14 |
| `server/utils/trackChangeMarks.js` (+test) | nieuw | 50 |
| `server/services/TableDataService.js` | `loadTrackMarks` + read-hook | 70 |
| `server/routes/auth.js` | conditionele sessie-insert bij login | 15 |
| `server/routes/admin.js` (+service) | config get/post + validatie | 50 |
| `src/components/admin/AdminPage.jsx` | tab | 10 |
| `src/components/admin/AdminTrackChangesSettings.jsx` | nieuw (mode + sessionRoles + legenda + kolomlijst) | 150 |
| `src/components/supplier/PurchaseOrderColumnHeader.jsx` | admin-toggle + indicator | 25 |
| `src/components/supplier/PurchaseOrderDataCell.jsx` | strip renderen | 15 |
| `src/components/supplier/TrackChangeMarks.jsx` | nieuw | 55 |
| `src/hooks/useTrackChanges.js` | nieuw (config laden/togglen) | 80 |
| `src/config/version.js` | bump v1.15.0 | 1 |

**Stop-signaal:** track-changes-logica in aparte hook `useTrackChanges.js` houden; `usePurchaseOrdersPage.js` (~1000 regels) niet verder laten groeien.

## 6. Teststrategie

- **Unit:** `buildMarkPattern` (eerste wijziging links-rood, shift bij sessie 2, geel na afloop, venster-slide >5, week-buckets, fresh-start: `activeOffset` maakt oudere buckets grijs i.p.v. geel).
- **Server:** `loadTrackMarks` bucket-logica (session vs week) met vaste timestamps; per-kolom `activeOffset` bij verschillende `activatedAt`.
- **Component:** `TrackChangeMarks` gradient + `aria-label`; header-toggle admin-gating.
- **Route:** POST-validatie `track-changes` (ongeldige `mode`/`sessionRoles` → 400); sessie-insert alleen bij rol ∈ `sessionRoles`.
- **Regressie:** geen actieve kolommen → helper niet aangeroepen (geen extra query, geen `tb_track_marks`-metric).

## 7. Observability & versie

- Server-Timing-metric `tb_track_marks` via `time()`.
- Frontend config-calls via `apiRequest` (perf-HUD + console).
- Versie ophogen naar `v1.15.0` (nieuwe feature) + footer.

## 8. Aannames (bevestigd)

Globaal/gedeeld · mode + `sessionRoles` globaal in admin-settings · v1 alleen custom `tb_`-kolommen (bron `tb_cell_history`) · sessie = login van een ingestelde rol (default admin+employee) · generiek voor alle `tb_*`-boards · fresh start vanaf activatie (per kolom).

## 9. Vervolg (buiten v1-scope)

- **D365-kolommen tracken:** union van `tb_cell_history.changed_at` met `tb_field_corrections.created_at` ([011_tb_metamodel.sql:308](../../scripts/db/migrations/011_tb_metamodel.sql#L308)) — analoog aan hoe `loadHistoryByCell` beide bronnen unioneert. Aparte story omdat de kolomnaam (`created_at` vs `changed_at`) en semantiek (correctie vs wijziging) per bron verschilt.
- **Sessie-retentie:** periodieke opschoning van `tb_track_change_sessions` (behoud laatste ~50).
