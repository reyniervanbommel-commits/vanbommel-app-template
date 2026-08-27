# PO table view tabs

## BRD

Staff and suppliers work from saved views on the purchase-order board. Users need to pin variants of one view as tabs (for example one tab per vendor, or an extra date-filtered tab) without duplicating formatting and column layout.

## FRD

- All orders stays the view dropdown; it has no tabs.
- A saved view owns filters, conditional formatting, columns, grouping, and its tab set.
- Tab All has no extra filters. Extra tabs may only add extra filters.
- Mixed extra filters are allowed (vendor tab next to a date tab).
- A group is extra tabs that share an extra filter on the same column. Group colour is chosen at group creation with ColorPalettePicker (fixed swatches + opacity) and can be changed later from the selected-tab menu.
- Bulk “Create tabs from column” uses unique values from the current view (after view filters), skips blanks, adds tabs (does not replace), default column = vendor account when present.
- Snapshot: new unique values later do not auto-add tabs.
- + New tab asks for a name and starts empty; extra filters are then set on that tab.
- Extra tabs can be closed; All cannot. Extra tabs can be reordered; All stays first.
- Many tabs: horizontal scroll + overflow menu. No second row.
- Last selected tab is remembered per view per user; first visit = All.
- Empty tabs stay visible. Vendors see tabs when the vendor view is configured that way.
- Vendor views: empty vendor account = all vendors; a vendor number assigns the view to that supplier (same field as user create).
- Save is explicit. On All: view settings + tab structure. On an extra tab: this tab, or all tabs in the same group (copy extra filters except the split value).

## TD

- Persist tabs in `po_saved_views.view_state_json` (`tabs.extraTabs`, `tabs.groups`) plus `vendorAccount` on the view state. No new SQL columns for tab UI.
- Client: `src/utils/viewTabs.js` (pure) + `usePurchaseOrderViewTabs` + tab bar/dialogs under `src/components/supplier/viewTabs/`.
- Server `normalizeViewState` must keep `tabs` and `vendorAccount`. Vendor list filter: suppliers only see vendor views with empty account or matching `vendor_account`.
- Last tab id in `user_board_settings` as `viewTabSelection`.
