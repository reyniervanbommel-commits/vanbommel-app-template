# Product attribute values (DevOps)

**Doel:** Vijfde D365-entiteit Product attribute values cachen, op Data model beheren, en gekozen attribuutnamen als PO-boardkolommen tonen.  
**Referentie in repo:** [.cursor/plans/dev_2026-09-02-product-attribute-values.plan.md](../../.cursor/plans/dev_2026-09-02-product-attribute-values.plan.md)  
**Spec:** [docs/specs/2026-09-02-product-attribute-values-design.md](../specs/2026-09-02-product-attribute-values-design.md)  
**Tags:** datamodel; d365; product-attribute-values; po-board  
**Work item:** Feature #AB:311 met child User Stories #AB:312–#AB:314

---

## User story

**Als** admin (rol `admin`) die het datamodel beheert  
**wil ik** de D365-entiteit Product attribute values ophalen, op de Data model-pagina beheren met dezelfde admin-functies als Items/Vendors/Product receipt lines, en gekozen attribuutnamen als aparte kolommen op het PO-board zetten  
**zodat** inkopers (en leveranciers op eigen orders) productkenmerken naast de PO-regel zien, zonder D365 te openen of Excel-workarounds.

---

## Acceptatiecriteria (definitie van "klaar")

1. Tab **Product attribute values** met syncfilter, cache/re-import, preview, kolomswitches, discover — geen Validate fields.
2. Elke D365-call bevat ProductNumber-scope uit de Items-cache; geen volledige dump. Company-filter uit. `max_rows` 10000. Chunk-cap 50 (1000 item numbers) → `truncated` + Engelse `notice_text`.
3. Switch per attribuutnaam default **uit**; `Season` aan → read-only kolom op PO-regels.
4. Exact `ItemNumber` = `ProductNumber` (partitionless).
5. Twee unieke waarden → eerste + `+N` + native `title`; leeg → lege cel (niet `0`). Geen Fluent Tooltip in de virtualized lijst.
6. Employee/supplier kunnen de ruwe PAV-API niet lezen; leverancier ziet boardkolommen alleen op eigen orders; geen writeback (400).
7. Items-fail → PAV tegen stale Items-cache; bestaande vier entiteiten blijven werken.
8. Night run: PAV ná Items (`relation_role = pivot`); migratie 046 idempotent in dezelfde PR.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Bewezen entiteit-patroon vendors/items/PRL | `scripts/db/migrations/021_tb_vendors_items_lookup.sql`, `029_product_receipt_lines.sql` |
| Items-cache als scope-bron | `tb_tables` key `items`, `tb_cache.record_key` |
| `slugify` al geëxporteerd | `server/services/TableColumnsService.js` |
| LinkedValueCell +N-patroon | `src/components/supplier/PurchaseOrderLinkedValueCell.jsx` |
| Design + bouwplan (review 🟢) | spec + `.cursor/plans/dev_2026-09-02-product-attribute-values.plan.md` |

---

## Backlog — child User Stories

### Story A (#AB:312): Sync, cache en night cascade
**Beschrijving:** Migratie 046, fetch-adapter scoped op Items-cache, cascade PAV ná Items.  
**Acceptatiecriteria:**
1. Idempotente migratie 046: table key `product-attribute-values`, CK lookup + pivot, geen `pav_*` seed.
2. Fetch AND-t admin-filter met ProductNumber-chunks; lege Items-cache → geen D365-call; sleutels via `buildPavRecordKey` (`partition_key = shared`). Adapter retourneert dezelfde recordvorm als `genericMasterD365Fetch`. Geen `__pavKeys` in `refresh()`.
3. Chunk-cap 50 → truncated + `notice_text` via `refresh()`.
4. Night refresh: `listRefreshCascadeTargets` retourneert `string[]` (lookup ∪ pivot) + `REFRESH_AFTER` items vóór PAV.
5. Admin-filter = `compileSyncRules(parseDefaultFilterRules(table.defaultFilter))`; geen `PO_SYNC_RULES`.

### Story B (#AB:313): Board-columns API en Data model-tab
**Beschrijving:** Admin-only GET/POST board-columns, vijfde Data model-tab, write-weigering.  
**Acceptatiecriteria:**
1. GET/POST `/api/data/product-attribute-values/board-columns` alleen admin; `visible` boolean; onbekende nieuwe naam → 400; bestaande verdwenen naam uitzetbaar → 200.
2. Tab Product attribute values met bestaande admin-functies minus Validate fields; panel switches default uit; geen Fluent Tooltip in Switch-lijst.
3. `correctField` / `saveCustomValue` / `setWriteBackConfig` → 400 voor PAV en `kind === product-attribute`.
4. Employee: geen ruwe PAV-API. Hook altijd aanroepen met `enabled` boolean; `useDataModelAdmin.js` niet wijzigen.

### Story C (#AB:314): PO-board pivot-kolommen
**Beschrijving:** Pivot op PO-read; line-cell toont first +N met title-hover.  
**Acceptatiecriteria:**
1. Pivot niet via `applyLookups`; `pavExtras` buiten `values`; camelCase json-keys (`productNumber` / `attributeName`).
2. `isProductAttributeColumn`; LinkedValueCell `hover="title"` op regels; Tooltip mag op header. Lege cel is leeg, niet `0`.
3. `PurchaseOrderSubitemLineRow` splitsen (`PurchaseOrderLineCellContent`); host en content ≤300 regels; versie PATCH; `devTestItems`-check.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-09-02-product-attribute-values.plan.md](../../.cursor/plans/dev_2026-09-02-product-attribute-values.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: `docs/devops/311-product-attribute-values.md`
