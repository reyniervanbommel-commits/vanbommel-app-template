# ProductReceiptLinesV2 als vierde datamodel-entiteit (DevOps)

**Doel:** Draai de deliver-remainder kolom-aanpak (026/027) terug en voeg `ProductReceiptLinesV2` toe als vierde D365-entiteit (zelfde patroon als vendors/items), met een composite lookup naar PO-regels voor received/remaining quantities.
**Referentie in repo:** `~/.cursor/plans/dev_productreceiptlinesv2_datamodel_941f3f64.plan.md` (globale Cursor-plans map)
**Tags:** datamodel; d365; product-receipt-lines; lookup; po-board
**Work item:** Feature #AB:230 met child User Stories #AB:231–#AB:236

---

## User story

**Als** inkoper
**wil ik** per PO-regel de ontvangen en resterende aantallen zien op het PO-board
**zodat** ik levering kan opvolgen zonder D365 te openen.

---

## Acceptatiecriteria (definitie van "klaar")

1. De deliver-remainder kolommen (`receivedPurchaseQuantity`, `deliverRemainderApprox`, `deliverRemainder`, migraties 026/027) staan op `is_active = 0` en verschijnen niet meer op het PO-board; migratie 028 is idempotent en non-destructief.
2. `Ontvangstregels` (`/data/ProductReceiptLinesV2`) bestaat als vierde datamodel-entiteit met 3-veld sleutel `dataAreaId,PurchaseOrderNumber,PurchaseOrderLineNumber` en 8 kolommen; `Sync now` vult `tb_cache`.
3. Een composite `fk_join`-lookup (PO detail → Ontvangstregels op PurchaseOrderNumber + LineNumber) verrijkt PO-regels met `received`/`remaining`/`productReceiptDate`/`productReceiptNumber`.
4. Meerdere ontvangsten per PO-regel dedupliceren naar één rij (latest receipt wint); de D365-quantity-semantiek is vóór bouw geverifieerd tegen een multi-receipt PO.
5. Een PO-regel zónder ontvangst toont **leeg** (niet `0`); admin kan de synthetische lookup-kolommen tonen/verbergen; vendor-scoped gebruiker ziet ze read-only mee.
6. Unit-tests voor composite `resolveRecordKeys`/`applyLookups` (match + geen-match) en inherited-filter-scope zijn groen; `npm test` groen; versie verhoogd naar `v1.18.0`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| D365-verificatie: PRLV2 heeft ReceivedPurchaseQuantity/RemainingPurchaseQuantity (Option A gekozen) | Plan-context (MCP/D365 ACC bevestigd) |
| Bewezen entiteit-patroon vendors/items om te kopiëren | [scripts/db/migrations/021_tb_vendors_items_lookup.sql](../../scripts/db/migrations/021_tb_vendors_items_lookup.sql) |
| PO detail-JSON bevat `purchaseOrderNumber` + `lineNumber` | [server/services/D365ODataService.js](../../server/services/D365ODataService.js) (~160–161) |
| `join_keys_json`-kolom bestaat al op `tb_relations` | [scripts/db/migrations/011_tb_metamodel.sql](../../scripts/db/migrations/011_tb_metamodel.sql) |

---

## Backlog — child User Stories

### Story A (#AB:231): Rollback deliver-remainder kolommen (Fase 1)
**Beschrijving:** Draai de deliver-remainder aanpak terug: migratie 028 (soft-delete via `is_active = 0`) + de detail-formula infra die uitsluitend hiervoor gebouwd was volledig terugdraaien om de diff klein te houden.
**Acceptatiecriteria:**
1. Migratie `028_rollback_po_deliver_remainder.sql` zet de 3 kolommen op `is_active = 0`, idempotent (`IF EXISTS … AND is_active = 1`), non-destructief; migraties 026/027 blijven in de repo (historie).
2. `buildDetailFormulaEvaluationContext`/`detailFormulaHasMissingSourceReference`/detail-formula eval in `TableDataService.read()` verwijderd; formule-validatie terug naar master-only in `tableColumnFormulaValidation.js`, `TableColumnsService.js`, `data.js`.
3. Bijbehorende tests en de scripts `verify-received-qty.mjs` / `probe-po-remainder-alternatives.mjs` verwijderd; `npm test` groen.

### Story B (#AB:232): Migratie 029 — entiteit + composite relatie (Fase 2)
**Beschrijving:** Nieuwe migratie `029_product_receipt_lines.sql` (patroon van 021) voor `tb_tables`/`tb_columns`/`tb_sync_state` + composite `fk_join` lookup-relatie met `join_keys_json`.
**Acceptatiecriteria:**
1. `tb_tables`-record `product-receipt-lines` (label `Ontvangstregels`, source `/data/ProductReceiptLinesV2`, key_fields `dataAreaId,PurchaseOrderNumber,PurchaseOrderLineNumber`, `sort_order` 220).
2. 8 `tb_columns` (scope master, source/D365) met juiste default-visibility; `tb_sync_state` seed-record.
3. `tb_relations`-record `fk_join`/`lookup`, source_scope `detail`, met `join_keys_json` (purchaseOrderNumber→purchaseOrderNumber, lineNumber→purchaseOrderLineNumber) en `lookup_fields_json`. Migratie idempotent.

### Story C (#AB:233): Backend record-keys, dedupe & inherited filter (Fase 3a–3d)
**Beschrijving:** `resolveRecordKeys` uitbreiden naar 3-veld pipe-sleutel, receipt-date-bewuste dedupe, `INHERITED_PO_FILTER_TABLE_KEYS` + `FETCH_ADAPTERS`-entry.
**Acceptatiecriteria:**
1. `resolveRecordKeys` levert bij ≥3 key_fields `recordKey = field2|field3|…` met `String().trim()`-normalisatie; unit-tests inclusief `10` (number) vs `"10"` (string).
2. De inherited-fetch dedupe (`dedupedRawByRecord.set`, ~regel 727) wordt receipt-date-bewust: hoogste `ProductReceiptDate` wint, bij gelijk hoogste `ReceivedPurchaseQuantity`.
3. `INHERITED_PO_FILTER_TABLE_KEYS` bevat `product-receipt-lines`; `FETCH_ADAPTERS['product-receipt-lines'] = genericMasterD365Fetch`; cascade-refresh na PO-sync werkt.

### Story D (#AB:234): Composite fk_join lookup-engine (Fase 3e)
**Beschrijving:** Composite lookup-matching toevoegen: `getLookups` leest `join_keys_json`; `buildLookupCacheKey` bouwt de composite key in zowel `loadSingleLookup` (byKey-index) als `applyLookups` (match).
**Acceptatiecriteria:**
1. `getLookups` (TableRegistryService) geeft `joinKeys` mee op het lookup-object (bewuste divergentie t.o.v. Excel-#161/#162 — afgestemd/gedocumenteerd).
2. `buildLookupCacheKey(partitionKey, sourceValues, lookup)` gebruikt in `loadSingleLookup`-index én `applyLookups`-match; zonder joinKeys blijft huidig gedrag.
3. Composite lookup in het read-path is gewrapt in `time('tb_lookup_composite', …)`; unit-tests voor match én geen-match (null → lege kolommen, niet `0`).

### Story E (#AB:235): Admin UI-tab Ontvangstregels (Fase 4)
**Beschrijving:** Admin-tab toevoegen zoals vendors/items, met inherited-filter-hint; geen extra groei van `DataPreviewTables.jsx`.
**Acceptatiecriteria:**
1. `AdminDataModel.jsx` heeft een tab **Ontvangstregels** via `useDataModelAdmin('product-receipt-lines')`.
2. `SyncFilterBuilder.jsx` toont de inherited-filter-hint (`isInheritedTable`) ook voor `product-receipt-lines`.
3. Admin kan kolommen op de main table aan/uit zetten via bestaande `EntityConfigTable` + `toggleVisibility`, identiek aan vendors/items.

### Story F (#AB:236): Tests, versie & validatie (Fase 6)
**Beschrijving:** Unit-tests afronden, versie bumpen, migraties op dev draaien en handmatig PO-board verifiëren.
**Acceptatiecriteria:**
1. Unit-tests (composite keys/lookup, inherited-filter-scope, FETCH_ADAPTERS-registratie) + `npm test` groen; `devTestItem` in `src/config/devTestItems.js` toegevoegd.
2. `src/config/version.js` verhoogd naar `v1.18.0` (MINOR).
3. Handmatige preview-check: PO-board toont `received`/`remaining` op regels voor een bekende PO; regel zónder ontvangst blijft leeg; migraties op dev uitgevoerd.

---

## Versie document

Aangemaakt op basis van `~/.cursor/plans/dev_productreceiptlinesv2_datamodel_941f3f64.plan.md` (globale Cursor-plans map); wijzig dit bestand bij nieuwe afspraken.
