// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-213-track-changes-v1-15-0',
    title: 'Feature 213 - Track changes op celniveau (v1.15.0)',
    checks: [
      'Admin sees an "Enable/Disable track changes" item in the column menu; non-admins do not',
      'Enabled columns show a history indicator icon in the column header',
      'A tracked, changed custom cell shows up to 5 marks at the bottom of the cell',
      'Marks use red (changed), yellow (completed session/week without change) and grey (running/before activation)',
      'Admin Settings > Track changes toggles Per session / Per week and stores the choice',
      'In session mode the session roles selection is visible and saved; hidden in week mode',
      'The legend shows colour AND text; the marks div has an aria-label (no tooltip in the cell)',
      'With no active columns there are no extra marks and no tb_track_marks Server-Timing metric',
      'The footer shows version v1.15.0',
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
