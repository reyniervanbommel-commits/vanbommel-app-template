// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'po-view-tabs',
    title: 'PO view tabs',
    checks: [
      'Save a view, then create tabs from a column (unique values of the current filters).',
      'All tab shows the shared view filters; extra tabs only add extra filters.',
      'Right-click the All tab for + Tab, From column, and group color.',
      'Right-click an extra tab to delete it.',
      'Setting an extra filter on an extra tab immediately asks This tab only vs All tabs with the same filter.',
      'Vendor views show the vendor account number after the view name in the view menu.',
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
