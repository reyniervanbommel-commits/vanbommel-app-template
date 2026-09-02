// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-303-po-table-zoom-v1-52-130',
    title: 'Feature 303 - PO table zoom (v1.52.130)',
    checks: [
      'Settings → General: Table zoom harmonica is open; 75–110% in steps of 5%, default 85%.',
      'Admin Save applies the scale for all users (table, charts, RCCP, KPIs). Employee can view but not save.',
      'Supplier and staff see the same scale on the PO board after refresh; sticky columns and row expand still work.',
      'Avatar menu no longer contains table zoom.',
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
