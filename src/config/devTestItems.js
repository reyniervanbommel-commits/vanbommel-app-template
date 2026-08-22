// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'po-active-rules-flyout',
    title: 'PO table — active filters & formatting flyout',
    checks: [
      'Filter icon sits next to the hamburger in the PO table header',
      'A presence dot appears only when a filter or formatting rule set is active',
      'Clicking the icon opens a right-side flyout titled Active filters & formatting',
      'Active header and line filters/rules are listed and can be cleared or edited',
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
