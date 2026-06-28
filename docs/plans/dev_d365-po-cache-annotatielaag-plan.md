# Implementatieplan: D365 Purchase Orders — SQL-cache + dynamische kolommen

**Status:** concept ter ontwikkeling
**Datum:** juni 2026
**Vervangt:** `.cursor/plans/d365-sql-sync-diff-plan` (override/diff-aanpak — verlaten)
**Sluit aan op:** [76-visie-d365-composite-proxy.md](../devops/76-visie-d365-composite-proxy.md)
**Tags:** d365; odata; purchase-orders; sql-cache; dynamische-kolommen; write-back

---

## 1. Doel en kernidee

Gebruikers werken in de app met Purchase Order-data uit D365, en willen:

1. **Zelf vrij kolommen toevoegen** (opmerkingen, hulpkolommen, status), op **hoofd- (PO) én subitem- (regel) niveau** — gekoppeld aan een PO/regel.
2. Een **snel** scherm — niet bij elke paginaload de trage D365 OData aanroepen.
3. **Soms** een D365-veld corrigeren dat **terug** moet naar D365, waarbij de **admin per kolom bepaalt** of write-back is toegestaan.
4. Bij heropenen zien **wat nieuw of gewijzigd** is sinds hun laatste bezoek.

**Kerngedachte:** D365-data wordt in SQL gecachet (`po_cache`) en in de app verrijkt met door gebruikers gedefinieerde kolommen. Lezen gaat altijd uit SQL (snel). D365 wordt alleen geraadpleegd bij een expliciete/lazy refresh. Correcties op write-back-kolommen gaan via een gecontroleerd write-back-pad terug naar D365.

### Eén uniforme kolom-registry (centrale ontwerpkeuze)

Zowel **D365-velden** als **eigen kolommen** staan in één registry (`po_columns`). Reden: write-back-config (admin) én toekomstige per-gebruiker zichtbaarheid (admin) moeten uniform op "een kolom" werken, ongeacht herkomst.

### Twee strikt gescheiden schrijfpaden

| | Eigen kolommen (app-only) | D365-veldcorrectie (write-back) |
|---|---|---|
| Bron-kolom | `source = custom` | `source = d365`, `writable_to_d365 = true` |
| Bestemming | Alleen SQL (`po_custom_values`) | SQL-cache **én** terug naar D365 |
| Snelheid | Instant (ms) | Traag (~1-3s, expliciete actie) |
| Faalkans | Nihil | Reëel (token, read-only veld, concurrency) |
| UI | Inline bewerken, autosave | Bewuste actie "Corrigeren in D365" + bevestiging |

Deze twee paden lopen **nooit** via dezelfde endpoint of UI-flow.

---

## 2. Vastgelegde beslissingen

- **D365-velden:** read-only referentie. De **admin** zet per kolom write-back aan/uit; alleen dán is een veld corrigeerbaar en wordt het teruggeschreven naar D365.
- **Eigen kolommen:** gebruikers voegen vrij toe op **hoofd- én subitem-niveau**. Dynamisch — geen vaste schemakolommen.
- **Kolom-scope nu:** gedeeld voor alle gebruikers (past bij de gedeelde dataset).
- **Kolom-scope later:** ontwerp moet **per-gebruiker zichtbaarheid** aankunnen — admin bepaalt welke gebruiker welke D365- én eigen kolommen ziet. Nu nog niet bouwen, wél compatibel ontwerpen (`po_column_visibility`).
- **Kolombeheer:** iedereen mag kolommen toevoegen, hernoemen en verwijderen. **Mitigatie:** verwijderen = **soft-delete** (`is_active = 0`), waarden blijven behouden; voorkomt onomkeerbaar dataverlies.
- **Versheid:** lezen altijd uit SQL-cache. Auto-refresh bij openen als cache ouder is dan ~15 min, plus handmatige "Vernieuwen"-knop. **Geen periodieke scheduler.**
- **Nieuw-detectie:** per gebruiker — highlight PO's die nieuw of in D365 gewijzigd zijn sinds déze gebruiker laatst keek.
- **Geen AI/LLM** in het datapad (conform doc 76).

---

## 3. Architectuur

```
                      refresh op aanvraag (knop / lazy > 15 min)
   D365 (read + write) <-------------------------------------> po_cache (SQL)
           ^                                                         |
           | write-through (writable_to_d365, optimistic lock)       |
           |                                                         v
    po_field_corrections (audit + status) <------------------ read-endpoint --> React UI
                                                                    ^   ^
    po_columns (registry: d365 + custom) -----------------------------+   |
    po_custom_values (EAV, getypeerd) -----------------------------------+
    po_column_visibility (toekomst, admin) / po_sync_state (per-user watermark)
```

- React praat nooit direct met D365. Express is de enige consumer.
- Hergebruik [server/services/D365ODataService.js](../../server/services/D365ODataService.js) als D365-client (uit te breiden met OAuth2 + write-back).

---

## 4. Datamodel (SQL)

Migraties in [scripts/db/migrations/](../../scripts/db/migrations/), idempotent (`IF NOT EXISTS`), conform bestaand patroon.

### `po_columns` — uniforme kolom-registry (D365 + custom)
- `id` (PK), `key` (slug, uniek per niveau), `label`
- `source` — `d365` | `custom`
- `level` — `header` | `line`
- `data_type` — `text` | `number` | `date` | `boolean` | `select`
- `options` — JSON, alleen bij `select`
- `d365_field` — D365-entiteitveld (bij `source = d365`), anders NULL
- `writable_to_d365` (bit) — **admin-only**; alleen zinvol als `d365_field` gezet is
- `write_mechanism` — `patch` | `action` | NULL (zie Fase 0; bepaalt haalbaarheid write-back)
- `is_active` (bit) — soft-delete
- `sort_order`, `created_by`, `created_at`, `updated_by`, `updated_at`

### `po_cache` — gecachete D365-waarden
- PK: `(data_area_id, order_number, line_number)`
- D365-velden (definitief na `$metadata`-verificatie, Fase 0)
- `d365_modified_at` — `ModifiedDateTime`/ETag (delta + optimistic concurrency)
- `synced_at`, `first_seen_at`, `removed_in_d365` (bit — deletes via volledige resync)

### `po_custom_values` — waarden van eigen kolommen (EAV, getypeerd)
- `column_id` → `po_columns.id`
- `data_area_id`, `order_number`, `line_number` (NULL voor header-niveau-kolommen)
- `value_text`, `value_number`, `value_date` — getypeerd opgeslagen volgens `data_type` (geen alles-in-NVARCHAR)
- `updated_by`, `updated_at`
- UNIQUE `(column_id, data_area_id, order_number, line_number)`

> EAV is hier het juiste patroon, juist omdat de kolommen door gebruikers gedefinieerd zijn. Getypeerde value-kolommen houden validatie en sortering/filtering mogelijk.

### `po_field_corrections` — write-back audit + status
- `id`, PK-verwijzing `(data_area_id, order_number, line_number)`, `column_id`, `d365_field`, `old_value`, `new_value`
- `based_on_modified_at` — basis voor optimistic concurrency (`If-Match`)
- `status` — `pending | applied | failed`, `error`
- `created_by`, `created_at`, `applied_at`

### `po_sync_state`
- Per gebruiker: `user_id`, `last_viewed_at`
- Globaal: `watermark` (hoogste `ModifiedDateTime` uit laatste refresh), `last_full_sync_at`

### `po_column_visibility` — toekomst (admin-gestuurd, nu alleen ontwerpen)
- `user_id`, `column_id`, `can_view` (bit)
- Afwezigheid = standaard zichtbaar. Pas bouwen wanneer personalisatie aan de beurt is.

---

## 5. Backend

### 5.1 D365ODataService uitbreiden
- **OAuth2 client-credentials** (token-cache + refresh vóór expiry) ter vervanging van het statische `D365_ODATA_BEARER_TOKEN`. **Blocker — eerst.**
- `$count=true` + `@odata.count` voor echte pagination (deels al aanwezig).
- Optioneel `$filter` op datum/scope i.p.v. verplicht supplier-filter.
- `writeBackField()` — `PATCH` (of bound Action) met `If-Match` (ETag) voor optimistic concurrency.

### 5.2 Nieuwe service `D365PurchaseOrderCacheService`
- `refresh({ scope })` — haalt D365 op binnen scope (`ModifiedDateTime gt watermark` voor delta), upsert in `po_cache`, werkt `watermark` bij, markeert nieuw/gewijzigd. Periodieke volledige resync zet `removed_in_d365` voor verdwenen rijen.
- `read({ filters, userId })` — `po_cache` + actieve `po_columns` + `po_custom_values`, samengevoegd tot rijen met hoofd- en regelkolommen; per-user nieuw-vlaggen o.b.v. `last_viewed_at`. (Later: filter kolommen op `po_column_visibility`.)
- `saveCustomValue(...)` — instant SQL-write naar `po_custom_values`.
- `correctField(...)` — alleen toegestaan als kolom `writable_to_d365`; schrijft `po_field_corrections` (pending), roept `writeBackField()` met `If-Match`, update cache + status; bij conflict/fout → `failed` met melding.

### 5.3 Kolombeheer-service
- `createColumn / renameColumn / deactivateColumn` — toevoegen/hernoemen/soft-delete (iedereen).
- `setWriteBackConfig(columnId, { writable, mechanism })` — **admin-only**.

### 5.4 Routes — `server/routes/purchaseOrders.js` (nieuw)
- **Niet** in `admin.js`. Achter `requireSession` + medewerker-rol (doc 76 §4.5).
- `GET /api/purchase-orders` — lezen (cache + kolommen + waarden + nieuw-vlaggen).
- `POST /api/purchase-orders/refresh` — refresh triggeren.
- `GET/POST/PATCH/DELETE /api/purchase-orders/columns` — kolombeheer (DELETE = soft-delete).
- `PATCH /api/purchase-orders/columns/:id/writeback` — write-back-config, **`requireRole('admin')`**.
- `PUT /api/purchase-orders/:order/:line?/value` — eigen kolomwaarde (instant).
- `POST /api/purchase-orders/:order/:line?/correct` — D365-veldcorrectie (write-back).
- `POST /api/purchase-orders/viewed` — `last_viewed_at` bijwerken.
- Server-side inputvalidatie op alle schrijfroutes; type-validatie tegen `po_columns.data_type`. Audit via bestaand `audit_log`-patroon.

---

## 6. Frontend

- [usePurchaseOrdersPage.js](../../src/hooks/usePurchaseOrdersPage.js) → lezen van de nieuwe SQL-backed endpoints; refresh-knop; lazy refresh bij openen wanneer cache stale is.
- [PurchaseOrdersBoardTable.jsx](../../src/components/supplier/PurchaseOrdersBoardTable.jsx) (hoofd) en [PurchaseOrdersSubitemsTable.jsx](../../src/components/supplier/PurchaseOrdersSubitemsTable.jsx) (regels):
  - **Dynamische kolomrendering** o.b.v. `po_columns` (per niveau header/line).
  - **Eigen kolommen** inline bewerkbaar, autosave naar value-endpoint.
  - **D365-velden** read-only, behalve `writable_to_d365` → bewuste actie met bevestiging + spinner + foutafhandeling.
  - **"Kolom toevoegen"** UI op beide niveaus (naam + type); hernoemen/verwijderen (soft-delete).
  - **Rij-highlight** voor nieuw/gewijzigd sinds laatste bezoek (rij-niveau, niet cel).
- Admin-UI: write-back per kolom aan/uit + mechanisme. (Later: per-gebruiker zichtbaarheid.)
- Styling via `makeStyles` + tokens, geen inline styles (cursor rules).

---

## 7. Fasering

| Fase | Inhoud | Levert op |
|------|--------|-----------|
| **0** (~1 dag) | OAuth2 client-credentials (vervangt statisch token); `$metadata` → echte veldnamen; per beoogd write-back-veld PATCH vs Action bepalen | Geverifieerd fundament |
| **1** | `po_cache` + `po_columns` + `po_custom_values`; refresh-knop + lazy refresh; read-endpoint met merge; eigen kolommen toevoegen/bewerken op beide niveaus | Werkend snel scherm met vrije kolommen — **zonder** write-back |
| **2** | `po_sync_state` (per-user), delta-refresh, rij-highlight nieuw/gewijzigd | Nieuw-detectie per gebruiker |
| **3** | `po_field_corrections`, admin write-back-config, write-through met optimistic concurrency, schrijf-scope OAuth | D365-correcties terug naar D365 |
| **4** (later) | `po_column_visibility` + admin-UI per-gebruiker zichtbaarheid | Personalisatie |
| **5** | Tests, OTAP/devops-runbook, versie-bump in app-footer | Oplevering |

Fase 1-2 leveren al volledige waarde; write-back (Fase 3) en personalisatie (Fase 4) houden de rest niet op.

---

## 8. Openstaande vragen (gating)

1. **Welke concrete D365-velden** mogen write-back krijgen (Fase 3)? Bepaalt PATCH (vrij veld) vs bound Action (status/boeking) — een dag vs een week. Zie doc 76 §4.3.
2. Welke **datatypes** willen we voor eigen kolommen ondersteunen bij start (tekst/getal/datum/ja-nee/keuzelijst)?
3. Wat is de **scope/datumfilter** van de cache (vanaf welke datum, welke statussen)?
4. Welke **D365-rollen/scopes** krijgt de Azure AD app-registratie (lezen + schrijven, minimale rechten)?
5. Heeft de PO-header een **navigation property** naar de regels (`$expand`) of client-side joinen op `PurchaseOrderNumber`? (doc 76 §4.2)
6. Mogen eigen kolommen op **hoofdniveau** ook leeg blijven per regel, of is overerving naar regels gewenst? (UX-detail subitems)

---

## 9. Risico's en mitigaties

- **Tokenverloop** → OAuth2 refresh (Fase 0); refresh door gebruiker getriggerd, geen stille timer.
- **Kolom-wildgroei / dataverlies** ("iedereen mag alles") → soft-delete + audit + behoud van waarden; later admin-zichtbaarheid om ruis te beperken.
- **Write-back-concurrency** → `If-Match`/ETag; bij conflict "ververs eerst", geen blinde overschrijving.
- **Read-only/boekings-velden** → vroeg PATCH vs Action bepalen (Fase 0); niet-schrijfbare velden niet als bewerkbaar tonen.
- **Deletes in D365** → periodieke volledige resync markeert `removed_in_d365`.
- **EAV-performance** → getypeerde value-kolommen + index op `(column_id, order_number, line_number)`; kolommen per pagina beperkt.
- **Stale cache** → versheidsindicator + Vernieuwen-knop; lazy-refresh-drempel instelbaar.
- **Geen scheduler** → geen lease/lock, geen scale-to-zero-probleem op Azure Container Apps.

---

*Concept ter ontwikkeling. Begin met Fase 0; beantwoord de gating-vragen in §8 vóór Fase 3.*
