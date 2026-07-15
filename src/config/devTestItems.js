// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-218-bi-tab-split-screen-v1-15-10',
    title: 'Feature 218 - BI tab and split-screen charts (v1.15.10)',
    checks: [
      'BI nav item appears for admin/employee and is absent for supplier',
      '/bi route is blocked for non-staff users',
      'A new bar chart (dimension + measure + sum) can be built, saved private, and appears after reload',
      'Chart name can be edited in the flyout header and saved',
      'Save/Cancel buttons appear at the top of the chart flyout',
      'Sharing a chart (shared) makes it visible to another staff user',
      'Clicking a chart opens flyout without infinite loading; only that chart reloads on edit',
      'KPI and pie charts are smaller; wide bar/line charts use 60% width',
      'Split-screen charts fit page width without horizontal scrollbar',
      'An active table filter is reflected in the split-screen chart data',
      'Split-screen toggle opens a bottom panel with selected charts in one row',
      'Starter charts render with real data on the BI page',
      'Footer shows version v1.15.10',
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
