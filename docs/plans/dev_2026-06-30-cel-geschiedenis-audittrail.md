# Voorstel: Cel-geschiedenis (audit trail) voor tabel-cellen — bron-neutraal

> **Status:** concept ter ontwikkeling — uitgewerkt voorstel
> **Datum:** 2026-06-30
> **Auteur-context:** wens om per cel een geschiedenis te tonen: een *datatrail* met **datum + tijd**, **welke waarde**, **wanneer** en **door welke gebruiker** getypt — generiek voor elke table-builder-tabel, niet alleen Purchase Orders.
> **Bouwt voort op:**
> - [dev_2026-06-30-generieke-table-builder-architectuur.md](dev_2026-06-30-generieke-table-builder-architectuur.md) — bron-neutraal `tb_*`-metamodel, provider-abstractie, generiek `<DataGrid>`
> **Tags:** audit; cel-geschiedenis; write-back; EAV; timeline; generiek; tb_*; bron-agnostisch

---

## 0. TL;DR

Per cel willen we kunnen terugzien **wie wat wanneer typte** — voor **elke** tabel die met de table-builder is samengesteld (vandaag PO, morgen Vendors, overmorgen een SQL-view), ongeacht de bron.

Een cel heeft twee soorten waarden, met elk een schrijfpad:

| Soort cel | Schrijfpad (generiek) | Houdt nu historie bij? |
|-----------|----------------------|:----------------------:|
| **App-native (toegevoegde) kolom** | `saveCustomValue` → `PUT /api/data/:tableKey/value` → `tb_custom_values` (EAV) | **❌ nee** — upsert; alleen de **laatste** waarde blijft |
| **Bronveld-correctie (write-back)** | `correctField` → `POST /api/data/:tableKey/correct` → `tb_field_corrections` | **✅ ja** — append-only, elke poging = 1 rij (oud/nieuw/wie/wanneer/status) |

> **Antwoord op de directe vraag — bestaat de D365-geschiedenis al?** Ja. De write-back-correcties op bronvelden (vandaag D365) worden al append-only vastgelegd (in de huidige code: `po_field_corrections`; bron-neutraal: `tb_field_corrections`). Die historie wordt alleen nog **nergens getoond**. Voor bronvelden is dit voorstel dus puur een **lees- + UI-laag** — geen nieuwe opslag. Alleen de **app-native kolommen** missen de opslag nog.

**Voorstel in één zin:** één bron-neutrale, append-only tabel `tb_cell_history` voor app-native cel-wijzigingen (atomair gevuld via `MERGE … OUTPUT … INTO`), plus een generiek **klok-icoon-popover** dat per cel één tijdlijn toont door `tb_cell_history` te **unioneren** met `tb_field_corrections`. Werkt voor elke tabel, elke bron.

---

## 1. Doel

**Als** gebruiker (op een willekeurige table-builder-tabel)
**wil ik** op een cel de geschiedenis openen
**zodat** ik zie welke waarde wanneer en door wie is ingevoerd, gewijzigd of teruggeschreven — een audittrail per cel, bron-onafhankelijk.

Niet-doelen (nu):
- Geen versie-*terugzetten* (revert) vanuit de UI — alleen tonen. De data ondersteunt revert later wel.
- Geen app-brede activiteitenpagina — dit is **cel-gebonden** historie (een admin-log kan later).
- Geen historie op de **bron zelf** (die leeft in D365/SQL/REST); wél op **onze** correcties daarop (write-back) en op onze app-native waarden.

---

## 2. Hoe dit in de generieke architectuur past

Conform [het table-builder-plan](dev_2026-06-30-generieke-table-builder-architectuur.md) is een tabel een **definitie** (`tb_tables`/`tb_columns`) die via een **provider** naar een bron wijst, met een lokale **materialisatie-laag** (`tb_cache` + EAV `tb_custom_values`) en write-back-audit (`tb_field_corrections`). Cel-historie is een natuurlijke uitbreiding van die laatste laag en is **volledig bron-onafhankelijk**, want ze ligt — net als de custom-waarden — lokaal naast de brondata.

De cel-sleutel is overal dezelfde bron-neutrale tuple (uit §4.5 van het architectuurplan):

```
(table_id, scope, partition_key, record_key, detail_key, column_id)
   tabel    master/  bron-scope   natuurlijke   regel-id /   kolom
            detail   (bv. company) sleutel       -1=master
```

- **`scope`** = `master` | `detail` (generaliseert PO's `header`/`line`).
- **`partition_key`** = bron-scope (bv. D365 `dataAreaId`/company); NULL/`'-'` als de bron er geen heeft.
- **`record_key`** = natuurlijke sleutel van de masterrij (bv. PO-nummer).
- **`detail_key`** = detailregel-id; `-1` voor master-niveau (zelfde sentinel-conventie als nu).

Geen enkele laag in dit voorstel kent D365: de provider doet de write-back, de historie registreert alleen de cel-sleutel + waarden.

---

## 3. Wat er nú is (geverifieerd in de huidige PO-implementatie)

Het generieke `tb_*`-spoor is nog niet gebouwd; de werkende code is PO-specifiek. Dit voorstel is generiek geschreven, met in §8 een **coexistentie-pad** zodat de popup de bestaande historie **vandaag** al kan tonen.

| Generiek (doel) | Huidige PO-implementatie (feitelijk) | Status |
|-----------------|--------------------------------------|--------|
| `tb_custom_values` (EAV) | `po_custom_values` — [007_purchase_orders_cache.sql:88-106](../../scripts/db/migrations/007_purchase_orders_cache.sql#L88-L106) | Upsert via `MERGE`, **geen historie** ([D365PurchaseOrderCacheService.js:474-486](../../server/services/D365PurchaseOrderCacheService.js#L474-L486)) |
| `tb_field_corrections` (write-back audit) | `po_field_corrections` — [010_po_field_corrections.sql](../../scripts/db/migrations/010_po_field_corrections.sql) | **Append-only, houdt al historie** (`old_value`/`new_value`/`created_by`/`created_at`/`status`) — [D365PurchaseOrderCacheService.js:527-561](../../server/services/D365PurchaseOrderCacheService.js#L527-L561) |
| `tb_cell_history` (nieuw) | — bestaat nog niet — | **Te bouwen** (dit voorstel) |
| Generiek `<DataGrid>` / `EditableCell` | [EditableCell.jsx](../../src/components/supplier/EditableCell.jsx) + [PurchaseOrderWriteBackCell.jsx](../../src/components/supplier/PurchaseOrderWriteBackCell.jsx) | Commit alleen bij echte wijziging ([EditableCell.jsx:82](../../src/components/supplier/EditableCell.jsx#L82)) → geen ruis-rijen |
| Generieke audit-infra | `audit_log` + [auditLog.js](../../server/middleware/auditLog.js) | App-breed, niet cel-geïndexeerd; hooguit secundaire spiegel |

**Conclusie:** bronveld-historie bestaat al (alleen onzichtbaar); app-native-historie ontbreekt. Het werk is: één tabel + meeschrijven + één leesroute + één popover — allemaal bron-neutraal te benoemen.

---

## 4. Ontwerpkeuze

### 4.1 Append-only historie naast de "huidige waarde"-tabel
`tb_custom_values` blijft de snelle current-value store (lezen = één rij per cel, voor het hot grid-pad). Daarnaast komt een **append-only** `tb_cell_history`: één rij per wijziging. Scheiding van *huidige waarde* (snel, ge-upsert) en *historie* (append, zelden gelezen) houdt het grid-leespad goedkoop.

### 4.2 Atomair meeschrijven via `MERGE … OUTPUT … INTO`
`MERGE` levert via `OUTPUT $action, deleted.*, inserted.*` in één statement de oude (`deleted`) én nieuwe (`inserted`) waarde, die direct `INTO tb_cell_history` stromen. Atomair, race-vrij, één round-trip — geen aparte read-before-write.

### 4.3 Eén tijdlijn, twee bronnen — bron-neutraal verenigd
De leesroute toont een **UNION** van:
- `tb_cell_history` (app-native edits, `source = 'custom'`),
- `tb_field_corrections` (write-back-correcties, `source = 'writeback'`, met `status`).

Eén chronologische trail per cel, ongeacht schrijfpad of bron. `tb_field_corrections` blijft ongewijzigd (geen dubbel schrijven).

### 4.4 Naamgeving sluit op het `tb_*`-spoor
`tb_cell_history` staat naast de in het architectuurplan al genoemde `tb_field_corrections` (§4.5). De seed-/strangler-migratie die `po_*`→`tb_*` overzet (architectuurplan §8.2) neemt deze tabel mee.

---

## 5. Datamodel — `tb_cell_history`

Bron-neutraal, append-only, getypeerd (oud + nieuw), met de generieke cel-sleutel. Idempotent (`IF NOT EXISTS`), conform projectconventie. Migratienummer = eerstvolgende vrije in het `tb_*`-spoor (zie §8 voor het coexistentie-alternatief tijdens de overgang).

```sql
-- Migratie NNN: bron-neutrale cel-geschiedenis (audit trail). Idempotent.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_cell_history' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_cell_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,                       -- FK → tb_tables.id
    column_id BIGINT NOT NULL,                      -- FK → tb_columns.id
    scope NVARCHAR(16) NOT NULL                     -- 'master' | 'detail'
      CONSTRAINT CK_tb_cell_history_scope CHECK (scope IN ('master','detail')),
    partition_key NVARCHAR(32) NOT NULL DEFAULT '-',-- bron-scope (bv. company); '-' = geen
    record_key NVARCHAR(128) NOT NULL,              -- natuurlijke sleutel masterrij
    detail_key INT NOT NULL DEFAULT -1,             -- detailregel; -1 = master-niveau
    action NVARCHAR(16) NOT NULL                    -- 'insert' | 'update' | 'clear'
      CONSTRAINT CK_tb_cell_history_action CHECK (action IN ('insert','update','clear')),
    -- oude waarde (getypeerd; NULL bij eerste invoer)
    old_value_text NVARCHAR(MAX) NULL,
    old_value_number DECIMAL(38,10) NULL,
    old_value_date DATETIME2 NULL,
    -- nieuwe waarde (getypeerd; NULL bij wissen)
    new_value_text NVARCHAR(MAX) NULL,
    new_value_number DECIMAL(38,10) NULL,
    new_value_date DATETIME2 NULL,
    change_reason NVARCHAR(512) NULL,               -- gereserveerd; nu niet gevuld (zie §9.6)
    changed_by INT NULL,                            -- FK → users.id (geen cascade)
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_cell_history_column FOREIGN KEY (column_id) REFERENCES dbo.tb_columns(id)
  );

  -- Hot read: alle wijzigingen van één cel, nieuwste eerst.
  CREATE INDEX IX_tb_cell_history_cell
    ON dbo.tb_cell_history (table_id, scope, partition_key, record_key, detail_key, column_id, changed_at DESC);
END
```

Ontwerpnoten:
- **Geen `ON DELETE CASCADE`** op de FK: historie moet een (soft-)verwijderde kolom overleven.
- **Getypeerde oud/nieuw** (zelfde triplet als `tb_custom_values`) houdt de weergave faithful en maakt later filteren/sorteren mogelijk.
- `action`: `'insert'` = eerste invoer, `'update'` = gewijzigd, `'clear'` = leeggemaakt (alle nieuw-velden NULL).
- `change_reason` staat er als **gereserveerd** veld; in v1 niet ingevuld (goedkoop later aan te zetten).

---

## 6. Backend (generieke serve-laag)

### 6.1 `saveCustomValue` — historie meeschrijven in de MERGE
In de generieke `TableDataService.saveCustomValue` (generalisatie van de huidige PO-service) breidt het `MERGE`-statement uit met `OUTPUT … INTO`. Geen extra query/transactie.

```sql
MERGE dbo.tb_custom_values AS target
USING (SELECT @tableId AS table_id, @columnId AS column_id, @scope AS scope,
              @partitionKey AS partition_key, @recordKey AS record_key, @detailKey AS detail_key) AS src
  ON  target.column_id = src.column_id AND target.table_id = src.table_id
  AND target.partition_key = src.partition_key AND target.record_key = src.record_key
  AND target.detail_key = src.detail_key
WHEN MATCHED THEN UPDATE SET
  value_text=@valueText, value_number=@valueNumber, value_date=@valueDate,
  updated_by=@userId, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT
  (table_id, column_id, scope, partition_key, record_key, detail_key,
   value_text, value_number, value_date, updated_by)
  VALUES (@tableId, @columnId, @scope, @partitionKey, @recordKey, @detailKey,
          @valueText, @valueNumber, @valueDate, @userId)
OUTPUT
  CASE
    WHEN $action = 'INSERT' THEN 'insert'
    WHEN @valueText IS NULL AND @valueNumber IS NULL AND @valueDate IS NULL THEN 'clear'
    ELSE 'update'
  END,
  deleted.value_text, deleted.value_number, deleted.value_date,     -- oude waarde (NULL bij INSERT)
  inserted.value_text, inserted.value_number, inserted.value_date   -- nieuwe waarde
INTO @changes (action, old_value_text, old_value_number, old_value_date,
               new_value_text, new_value_number, new_value_date);
-- Daarna: INSERT INTO tb_cell_history SELECT … FROM @changes (best-effort).
```

> ⚠️ **MSSQL-restrictie (geleerd bij de bouw):** een `MERGE … OUTPUT … INTO` mag **niet** rechtstreeks naar een tabel schrijven die een **foreign key** of **CHECK-constraint** heeft — en `tb_cell_history` heeft beide. Daarom vangt `OUTPUT` de wijziging op in een **table-variable** `@changes`, waarna een aparte `INSERT` de historie wegschrijft. Die historie-insert is **best-effort** (in een try/catch): de waarde-opslag is primair en mag nooit falen door de audit-trail (bv. als de tabel nog niet gemigreerd is). Deze aanpak is in de PO-implementatie gebouwd en getest.

### 6.2 Nieuwe service-functie: `getCellHistory`
Eén bron-neutrale functie die beide bronnen unioneert, joint met `users`, chronologisch teruggeeft.

```js
// getCellHistory — verenigde tijdlijn voor één cel (custom-edits + write-back-correcties)
async function getCellHistory({ tableId, scope, partitionKey, recordKey, detailKey, columnId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('columnId', sql.BigInt, columnId)
    .input('scope', sql.NVarChar(16), scope)
    .input('pk', sql.NVarChar(32), partitionKey ?? '-')
    .input('rk', sql.NVarChar(128), String(recordKey))
    .input('dk', sql.Int, detailKey ?? -1)
    .query(`
      SELECT 'custom' AS source, h.action, h.changed_at AS at,
             h.old_value_text, h.old_value_number, h.old_value_date,
             h.new_value_text, h.new_value_number, h.new_value_date,
             NULL AS status, h.change_reason, u.email AS user_email, u.full_name AS user_name
      FROM dbo.tb_cell_history h
      LEFT JOIN dbo.users u ON u.id = h.changed_by
      WHERE h.table_id=@tableId AND h.column_id=@columnId AND h.scope=@scope
        AND h.partition_key=@pk AND h.record_key=@rk AND h.detail_key=@dk
      UNION ALL
      SELECT 'writeback' AS source, 'correct' AS action, c.created_at AS at,
             c.old_value, NULL, NULL, c.new_value, NULL, NULL,
             c.status, NULL, u2.email, u2.full_name
      FROM dbo.tb_field_corrections c
      LEFT JOIN dbo.users u2 ON u2.id = c.created_by
      WHERE c.table_id=@tableId AND c.column_id=@columnId AND c.scope=@scope
        AND c.partition_key=@pk AND c.record_key=@rk AND c.detail_key=@dk
      ORDER BY at DESC;
    `);
  return r.recordset.map(formatHistoryRow); // typed value → weergavestring
}
```

> Pas `users`-kolomnamen aan op het echte schema ([001_initial.sql](../../scripts/db/migrations/001_initial.sql)); `LEFT JOIN` zodat een verwijderde gebruiker de trail niet breekt.

### 6.3 Route — generiek onder `/api/data/:tableKey`
Conform §6.3 van het architectuurplan, achter `requireSession`:

```
GET /api/data/:tableKey/history?scope=&partitionKey=&recordKey=&detailKey=&columnId=
  → 200 { history: [ { source, action, at, oldValue, newValue, status, reason, user: { name, email } }, … ] }
```

Validatie: alleen cellen van **actieve** kolommen die `custom` óf `writable` zijn; cel-sleutels verplicht + lengte-begrensd (zelfde guards als `saveCustomValue`); injectie-whitelisting per provider blijft in de write-paden.

### 6.4 (Optioneel) spiegel naar `audit_log`
Additioneel `auditLog(userId, email, 'cell.update', 'tb_custom_values', \`${tableKey}/${recordKey}/${detailKey}/${columnId}\`, { old, new })` voor een latere app-brede admin-log. Niet de primaire bron (geen cel-index).

---

## 7. Frontend (generiek)

### 7.1 Klok-icoon op de cel — in het generieke grid
In het generieke `EditableCell` (de bron-neutrale variant van [EditableCell.jsx](../../src/components/supplier/EditableCell.jsx)) komt naast het control een subtiel **`History20Regular`-icoon** (`@fluentui/react-icons`), zichtbaar op hover/focus. Klik opent een Fluent `Popover` met de tijdlijn.

```jsx
<Popover>
  <PopoverTrigger disableButtonEnhancement>
    <Button appearance="subtle" size="small" icon={<History20Regular />} aria-label="Geschiedenis" />
  </PopoverTrigger>
  <PopoverSurface>
    <CellHistoryTimeline tableKey={tableKey} cellKeys={cellKeys} columnId={columnId} />
  </PopoverSurface>
</Popover>
```

**Belangrijk voor je tweede vraag:** datzelfde icoon + popover komen óók op de **write-back-cel** (de bron-neutrale variant van [PurchaseOrderWriteBackCell.jsx](../../src/components/supplier/PurchaseOrderWriteBackCell.jsx)). Eén gedeeld `CellHistoryTimeline`-component voor beide → de bestaande D365-correctiehistorie (`tb_field_corrections` / vandaag `po_field_corrections`) wordt zo direct inzichtelijk via dezelfde popup.

### 7.2 Nieuw component `CellHistoryTimeline.jsx` (generiek)
- Lazy laden bij openen: `GET /api/data/:tableKey/history?…`.
- Verticale tijdlijn, **nieuwste boven**, per regel:
  - **datum + tijd** (`Intl.DateTimeFormat('nl-NL', { dateStyle:'short', timeStyle:'short' })`),
  - **gebruiker** (naam; e-mail als tooltip),
  - **waarde-overgang** `oud → nieuw` (oud grijs/doorgestreept; `insert` = alleen nieuw; `clear` = "— (leeggemaakt)"),
  - **badge** bij `source='writeback'` met `status` (pending/applied/failed).
- States: laden (`Spinner`), leeg ("Nog geen wijzigingen"), fout.
- **Volledig tabel-/bron-onafhankelijk** — het kent alleen `tableKey` + cel-sleutels.

### 7.3 Hook
Het component fetcht direct via `apiRequest` (lazy, geïsoleerd) — geen globale grid-state vervuilen. Eventueel een dunne `loadCellHistory(cellKeys)` in `useTableGrid(tableKey)` (de generieke hook uit architectuurplan §7.3).

---

## 8. Coexistentie tijdens de strangler-fig-overgang (kritiek)

Het `tb_*`-spoor bestaat nog niet; vandaag draait `po_*`. Twee opties om dit voorstel **nu** waarde te laten leveren:

- **Optie A — meeliften op het `tb_*`-spoor (voorkeur als de table-builder eerst landt):** bouw `tb_cell_history` als onderdeel van Fase A van het architectuurplan; de PO-tabel draait dan al op `tb_*` en krijgt de historie "gratis". Geen dubbel werk.
- **Optie B — vandaag al op `po_*` (voorkeur als de historie eerder gewenst is dan de table-builder):** voeg nu `po_cell_history` toe (migratie 011, zelfde schema met `data_area_id`/`order_number`/`line_number` i.p.v. de generieke sleutel), schrijf mee in de bestaande PO-`MERGE`, en laat de popup unioneren met het **al bestaande** `po_field_corrections`. De seed-migratie `po_*`→`tb_*` (architectuurplan §8.2) hernoemt later 1-op-1 (`header`→`master`, `line`→`detail`, `data_area_id`→`partition_key`, `order_number`→`record_key`, `line_number`→`detail_key`).

> **Besluit (2026-06-30): optie A.** De cel-historie wordt gebouwd **als onderdeel van Fase A van de table-builder** (`tb_*`). PO draait dan al op `tb_*` en krijgt de historie "gratis"; geen los `po_*`-werk dat later gemigreerd moet worden. Dit voorstel is daarmee een **uitbreiding van architectuurplan Fase A** (metamodel-migraties + `TableDataService`): voeg `tb_cell_history` toe aan die migratieset en het `OUTPUT … INTO` aan de generieke `saveCustomValue`. De mapping-tabel hieronder blijft relevant voor de seed-migratie die de bestaande PO-data (incl. `po_field_corrections`) overzet, zodat de al bestaande D365-historie meeverhuist en in de popup zichtbaar wordt.

Mapping `po_*` ↔ `tb_*` (voor de naadloze overgang):

| `po_*` (vandaag) | `tb_*` (generiek) |
|------------------|-------------------|
| `level` (`header`/`line`) | `scope` (`master`/`detail`) |
| `data_area_id` | `partition_key` |
| `order_number` | `record_key` |
| `line_number` (−1=header) | `detail_key` (−1=master) |
| (impliciet "PO-board") | `table_id` |

---

## 9. Beslissingen voor te leggen (met aanbeveling)

1. **Coexistentie A of B?** (zie §8)
   → **Besloten: A** (2026-06-30) — meeliften op `tb_*` Fase A; geen los `po_*`-spoor. De seed-migratie verhuist de bestaande D365-correctiehistorie mee.
2. **Eén verenigde tijdlijn of gescheiden?**
   → *Aanbeveling:* verenigd (UNION custom + write-back). Complete trail per cel, lage kosten.
3. **Revert vanuit de UI?**
   → *Aanbeveling:* nu **niet** (alleen tonen); data ondersteunt het later.
4. **Retentie / opschonen?**
   → *Aanbeveling:* alles bewaren (audit); cel-index houdt lezen snel.
5. **UI-plek:** popover op de cel vs. detailregel?
   → *Aanbeveling:* **popover** (klok-icoon), direct bij de cel.
6. **Wijzigingsreden (`change_reason`)?**
   → *Aanbeveling:* veld nu **reserveren**, niet bouwen; goedkoop later aan te zetten.

---

## 10. Risico's & mitigaties

| Risico | Mitigatie |
|--------|-----------|
| **Geen backfill** custom-waarden — historie vóór livegang ontbreekt | Communiceren: trail start bij ingebruikname. **D365-correcties** hebben wél al historie (vanaf #134). |
| **Ruis-rijen** bij identieke "wijziging" | `EditableCell` commit alleen bij echte wijziging ([EditableCell.jsx:82](../../src/components/supplier/EditableCell.jsx#L82)); evt. gelijkheids-guard in de service. |
| **`MERGE OUTPUT INTO`-valkuil** | Bewezen patroon; `action` als `CASE $action`; integratietest. |
| **Verwijderde kolom/gebruiker breekt trail** | FK **zonder cascade**; `LEFT JOIN users`; soft-delete kolommen. |
| **Performance groot grid** | Historie **lazy** (alleen bij openen popover), niet in grid-read; aparte cel-index. |
| **Twee sporen (`po_*`/`tb_*`)** | Identiek schema + UI; alleen sleutel-kolomnamen verschillen; mapping-tabel §8. |

---

## 11. Gefaseerde uitvoering

| Fase | Inhoud | Levert |
|------|--------|--------|
| **1 — Data + schrijf** | Migratie `tb_cell_history` (of `po_cell_history`, optie B); `MERGE` uitbreiden met `OUTPUT … INTO` | App-native edits worden vastgelegd |
| **2 — Lees + route** | `getCellHistory` (UNION met `*_field_corrections`); `GET /api/data/:tableKey/history` + validatie | **Bestaande D365-historie + custom-historie opvraagbaar per cel** |
| **3 — UI** | Klok-icoon in generiek `EditableCell` én write-back-cel; gedeelde `CellHistoryTimeline`-popover; NL-datumformaat | Gebruiker ziet één tijdlijn per cel |
| **4 — Afronding** | Vitest (service + route), `tb_*`-seed-noot, optionele `audit_log`-spiegel, OTAP-preview | Geteste oplevering |

Fase 2 levert al jouw tweede wens: de **reeds bestaande** D365-veldhistorie wordt inzichtelijk via de popup. Fase 1 + 3 voegen de ontbrekende app-native-historie en de UI toe.

---

## 12. Definition of Done

- Elke wijziging van een **app-native** cel legt een rij in `tb_cell_history` vast (oud→nieuw, gebruiker, tijdstip).
- Een gebruiker opent op een cel een **klok-icoon** en ziet een chronologische tijdlijn (datum+tijd, gebruiker, waarde-overgang), **inclusief de al bestaande write-back-/D365-correcties** uit `tb_field_corrections`.
- De feature is **bron-neutraal**: geen laag boven de provider kent D365; werkt op elke table-builder-tabel.
- Validatie + tests groen; migratie idempotent; naamgeving stemt op het `tb_*`-spoor.

---

*Concept ter ontwikkeling. Kernkeuze: bron-neutrale, append-only `tb_cell_history` naast de current-value-tabel, atomair gevuld via `MERGE … OUTPUT … INTO`, getoond als per-cel tijdlijn die met `tb_field_corrections` unioneert. De write-back-/D365-historie bestaat al en wordt met dit voorstel zichtbaar gemaakt. Past binnen het generieke table-builder-spoor (Feature #130).*
