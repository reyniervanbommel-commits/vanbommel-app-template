# PO-board remarks-zoekfilter (DevOps)

**Doel:** Remarks-kolomfilter (`contains`) zoekt in alle actieve remarks van een order, zonder de board-load te verzwaren.  
**Referentie in repo:** [`.cursor/plans/dev_2026-08-27-po-board-remarks-search.plan.md`](../../.cursor/plans/dev_2026-08-27-po-board-remarks-search.plan.md)  
**Spec:** [docs/specs/2026-08-27-po-board-remarks-search-design.md](../specs/2026-08-27-po-board-remarks-search-design.md)  
**Azure DevOps Feature:** [#277](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/277)  
**Tags:** remarks; purchase-orders; filter; search

---

## User story

**Als** medewerker of leverancier (eigen orders)  
**wil ik** purchase orders filteren op remarktekst, inclusief oudere remarks  
**zodat** ik de juiste order terugvind zonder elke thread te openen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Remarks-kolommenu toont Filter met alleen `contains`; sort en unique-picker ontbreken.
2. Apply met ≥ 2 tekens filtert op actieve remarks in de hele thread, niet alleen de laatste cel.
3. AND met andere kolomfilters; saved views en active-filters-flyout.
4. Zonder remarks-filter: geen extra search-call.
5. Supplier: alleen eigen orders.
6. API-fout: toast, laatste matches blijven; geen terugval naar alle rijen.
7. Geen soft-deleted remarks, geen D365-comments.
8. Unique-values van andere kolommen blijven gevuld; KPI volgt remarks-filter; BI krijgt remarks niet.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Remarks-kolom, summary en thread-API | `server/services/RowRemarksService.js`, `GET /api/data/:tableKey/remarks` |
| Kolomfilter-infrastructuur (Apply, saved views, flyout) | `usePurchaseOrderTableView`, `PurchaseOrderColumnFilterMenu` |
| Supplier-scope op data-API | `server/middleware/dataAccess.js`, `filterRowsForSupplier` |
| Validatie remarks-body | `server/services/RowRemarksValidation.js` |

---

## Backlog — child User Stories

### #278 — Search-API voor remarks

`GET /api/data/:tableKey/remarks/search?q=` geeft alleen matching `{ partitionKey, recordKey }` terug. CHARINDEX, geen bodies, supplier-allowlist + IDOR.

**Acceptatiecriteria:**
1. Query NFC/trim, 2–200 tekens, control-chars geweigerd (400 Engels).
2. SQL: DISTINCT keys, `is_deleted = 0`, `detail_key = -1`, geen `body` in SELECT.
3. Supplier ziet alleen eigen order-keys; pad op allowlist.
4. `time('remarks_search_sql')`; `q` niet gelogd.

### #279 — Board-intersectie zonder load te verzwaren

Client slaat remarks over in de value-pass, haalt keys op bij Apply, intersecteert rijen. KPI volgt remarks; unique-values van andere kolommen blijven gevuld; BI krijgt remarks niet.

**Acceptatiecriteria:**
1. Zonder remarks-filter: geen search-call.
2. Eerste fetch (`enabled` en keys nog `null`): lege tabel, niet alle rijen.
3. API-fout: toast, vorige matches blijven; geen terugval naar alle rijen.
4. `kpiSourceItems` = na remarks-filter; unique-values andere kolommen gevuld.

### #280 — Kolommenu en flyout contains-only

Remarks-menu toont Filter `contains` zonder sort/unique/kleur/grouping. Min. 2 tekens, Engelse hint, versie PATCH.

**Acceptatiecriteria:**
1. Filter zichtbaar; sort, unique-picker, kleur en grouping ontbreken.
2. Operator-flyout verborgen als alleen `contains`.
3. Apply met < 2 tekens wijzigt geen filterstate; hint `Enter at least 2 characters`.
4. Active-filters-flyout en saved views ondersteunen de term.
5. Footer `v1.52.21`; DEV-testitem bijgewerkt.

---

## Volgorde en afhankelijkheden

1. #278 — search-API en validatie.
2. #279 — board-intersectie (hangt van #278 af).
3. #280 — kolommenu/flyout (kan deels parallel met #279).

De volledige API-contracten, UI-details, testmatrix en performance-eisen staan in het implementatieplan.

---

## Versie document

Aangemaakt op basis van [`.cursor/plans/dev_2026-08-27-po-board-remarks-search.plan.md`](../../.cursor/plans/dev_2026-08-27-po-board-remarks-search.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/277-po-board-remarks-search.md
