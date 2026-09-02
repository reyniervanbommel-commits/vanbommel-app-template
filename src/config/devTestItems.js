// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-302-header-push-line-writeback-v1-52-128',
    title: 'Feature 302 - Header write-back of pushed D365 line values (v1.52.128)',
    checks: [
      'Staff can edit a Push values to header column when the source line column has D365 write-back on',
      'Saving from that header writes the value to all lines of that PO (also when the cell shows +N)',
      'With multiple header rows selected, editing a pushed cell asks This cell only vs Apply to selected rows',
      'A D365 write-back icon is visible on the pushed writable header column',
      'After a successful header write-back, expanded lines show a history fold on every updated line',
      'Suppliers cannot edit the pushed header (read-only, no write-back)',
    ],
  },
  {
    id: 'feature-303-po-table-zoom-v1-52-131',
    title: 'Feature 303 - PO table zoom (v1.52.131)',
    checks: [
      'Settings → General: Table zoom harmonica is open; 75–110% in steps of 5%, default 85%.',
      'Admin Save applies the scale for all users (table, charts, RCCP, KPIs). Employee can view but not save.',
      'Supplier and staff see the same scale on the PO board after refresh; sticky columns and row expand still work.',
      'Avatar menu no longer contains table zoom.',
    ],
  },
  {
    id: 'feature-295-bulk-writeback-conflicts-v1-53-3',
    title: 'Feature 295 - Bulk write-back background job (v1.53.3)',
    checks: [
      'Apply to selected rows on a D365 column closes the confirm dialog immediately; header badge shows Write-back n/total with the D365 icon',
      'Locked cells are only the selected rows in that one column (queued tint, writing spinner inside the cell); other columns stay editable',
      'A second bulk write-back is blocked until the first job finishes',
      'When every row succeeds the header badge shows Write-back complete, then disappears',
      'When a row fails the badge stays, the result panel lists the PO and D365 error, and Retry / Retry all failed work',
      'Selecting 25+ rows shows the one-by-one warning in the confirm dialog',
      'Bulk-edit on a non-D365 column still blocks the dialog and stops on first error (no background job)',
      'Going to Settings while a job runs keeps the badge and the batch going; closing the tab stops it',
    ],
  },
  {
    id: 'feature-307-po-order-filter-rccp-v1-53-4',
    title: 'Feature 307 - PO order filter drives RCCP (v1.53.4)',
    checks: [
      'Order column filter limits the RCCP strip to those purchase-order stacks',
      'Status or KPI filter also limits the strip to the visible rows',
      'Clearing filters restores the full vendor load on the strip',
      'One shared vendor without a vendor column filter auto-loads the strip',
      'Two vendors in view: no auto-vendor',
      '/rccp vendor field is pre-filled; the chart stays vendor-wide (no silent PO subset)',
      'Matrix click does not open a drill-down panel',
    ],
  },
];

/** Flat checklist rows for DevFeatureChecklist (one checkbox per check line). */
export function buildDevChecklistItems(items = devTestItems) {
  return items.flatMap((feature) =>
    (feature.checks || []).map((check, index) => ({
      id: `${feature.id}--${index}`,
      label: check,
      title: feature.title,
    }))
  );
}
