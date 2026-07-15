# RCCP — Rough Cut Capacity Planning

Rough Cut Capacity Planning (RCCP) compares planned vendor capacity against live purchase order load per ISO week and category.

## Where to find it

- Dashboard: `/rccp` (admin, employee, supplier)
- Settings: Admin → RCCP

## Capacity template

Download the Excel template from the RCCP page (**Import Excel → Download template**). Required columns:

| Column | Description |
|--------|-------------|
| VendorCode | Vendor account |
| Year | ISO week year |
| ISOWeek | ISO week number (1–53) |
| CapacityCategory | Capacity category label |
| CapacityQuantity | Available capacity quantity |

Import flow:

1. Upload the file and run **Preview**
2. Invalid rows are listed separately; they block commit
3. Duplicate rows follow the admin duplicate policy (`update` or `skip`)
4. **Commit import** writes valid rows and stores an `rccp_import_batches` record

## Settings

Configure on **Admin → RCCP**:

- **Vendor / date / quantity / category columns** — taken from purchase order master and line columns
- **Excluded PO statuses** — excluded from live load calculation
- **Thresholds** — green and orange utilization percentages
- **Duplicate import policy** — update or skip existing capacity keys

Changing the **category column** does not rewrite existing capacity rows; they stay linked to the old category values.

## Live load calculation

PO load is calculated live via `TableDataService.read('purchase-orders')`:

- Date comes from the configured line column, falling back to the order header
- Lines without a date appear in the warning card and are excluded
- Excluded statuses are skipped
- Missing categories are grouped under **Unclassified**

## Supplier access

Suppliers have read-only access to RCCP for their own vendor. Query-string vendor filters are ignored. Write actions (add capacity, import) are disabled.

## Status colors

| Situation | Color | Label |
|-----------|-------|-------|
| available = 0, confirmed = 0 | Grey | N/A |
| available = 0, confirmed > 0 | Red | Unplanned |
| available > 0, util ≤ green threshold | Green | OK |
| available > 0, util ≤ orange threshold | Orange | Warning |
| available > 0, util > orange threshold | Red | Overloaded |

Status is always shown as color **and** text.

## Drill-down

Click a matrix cell to open the underlying PO lines (order, line, item, quantity, date, status). When the date comes from the order header, a **Date from order header** badge is shown.
