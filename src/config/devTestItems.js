// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-224-rccp-v1-18-2',
    title: 'Feature 224 - RCCP capacity planning (v1.18.2)',
    checks: [
      'The /rccp page loads for admin, employee and supplier roles',
      'Vendor filter is a dropdown with vendors from the configured main-table vendor column',
      'Confirmed load (red chart line) uses the admin-selected quantity column from Settings > RCCP',
      'The matrix shows category rows and ISO week columns with available/confirmed/util% and color + text status',
      'Cells with available=0 and confirmed>0 show red Unplanned (never grey N/A)',
      'Load diagnostics card appears when confirmed load is zero and explains missing dates or week range issues',
      'PO load is calculated live from purchase orders using the configured columns',
      'Admin can configure date/quantity/category/vendor columns and thresholds on Settings > RCCP',
      'Capacity can be added manually and imported via Excel template with preview and commit',
      'Clicking a matrix cell opens drill-down with order, line, item, quantity, date and status',
      'Suppliers see read-only RCCP for their own vendor only; write actions are disabled',
      'The footer shows version v1.18.2',
    ],
  },
  {
    id: 'feature-213-track-changes-v1-17-3',
    title: 'Feature 213 - Track changes op celniveau (v1.17.3)',
    checks: [
      'Admin Settings > Track changes shows ALL header + line columns (except lookup) in a table with a toggle per row',
      'Turning a column on or changing granularity shows a reset warning; confirming restarts all tracking at 0 (shared start)',
      'Turning a column off works via the Settings toggle without resetting the others',
      'The board column menu no longer contains any track-changes option (fully centralised in Settings)',
      'The session-roles section stays visible in week mode but is disabled (does not disappear)',
      'A tracked, changed cell shows up to 8 dots at the bottom of the cell (also on subitem/line cells)',
      'Editing a tracked cell turns the rightmost dot red immediately, without logging out/in first',
      'Dots use red (changed), yellow (completed session/week without change) and grey (running/before activation)',
      'All track-changes UI text is in English',
      'With no active columns there are no extra marks and no tb_track_marks Server-Timing metric',
      'The footer shows version v1.17.3',
    ],
  },
  {
    id: 'feature-207-row-remarks-v1-14-142',
    title: 'Feature 207 - Row remarks, activity feed and panel UX (v1.14.142)',
    checks: [
      'Remark badge, Remarks cell and cell context menu open the same panel with PO number in the header',
      'Composer shows the signed-in user avatar (not CU) and new remarks do not duplicate after save',
      'History tab shows an Excel-style table with filterable Action, Column and User headers',
      'History dates and value changes display as dd/mm/yyyy instead of raw ISO timestamps',
      'Board row height stays fixed when a remark count badge appears on the cloud icon',
      'All board and sub-row cells truncate overflowing text without increasing row height',
      'Remarks, reactions, soft delete, polling and keyboard focus work with two employee accounts',
    ],
  },
  {
    id: 'feature-203-d365-product-images',
    title: 'Feature 203 - D365 product images (v1.14.142)',
    checks: [
      'The board shows a dedicated Image column with a cloud icon in the header',
      'Thumbnails fill the Image cell width without increasing row height',
      'Hovering a thumbnail shows the full product image scaled proportionally at 5x',
      'The Image column can be made sticky via the column menu',
      'The Image column can be dragged to another position and stays in that order',
      'The Image column can be resized narrower than regular columns',
      'Each visible, non-removed line with an item number shows a product thumbnail in the Image column',
      'The order header Image column shows the first visible item and +N for additional unique items',
      'Clicking a thumbnail opens a popup with the large image and the item number below it',
      'A missing product image stays empty without a broken-image icon',
      'An unauthorized request to /api/media/product-image is rejected',
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
