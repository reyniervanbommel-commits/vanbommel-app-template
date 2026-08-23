// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-266-po-board-active-filters-flyout-v1-51-29',
    title: 'Feature 266 - PO board active filters flyout (v1.51.29)',
    checks: [
      'Filter icon sits next to the hamburger in the PO table header',
      'The icon turns yellow with thicker lines when a header filter or formatting rule is active; no presence dot',
      'Clicking the icon opens a right-side flyout titled Active filters & formatting',
      'Active header filters can be listed, cleared and edited; line filters stay out of the flyout',
      'Active header and line conditional formatting can be listed, cleared and edited',
      'A filtered column shows only the yellow bar under the header, not a filter icon in the header',
      'The table does not get extra API calls while the flyout is closed',
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
