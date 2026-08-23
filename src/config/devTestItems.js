// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-262-d365-night-refresh-v1-51-31',
    title: 'Feature 262 - D365 night refresh (v1.51.31)',
    checks: [
      'Settings → D365 refresh: admin sees live progress, history (max 20), Start and alert emails; employee does not see the menu item',
      'Manual or night run: purchase orders first, then lookups; history shows inserted/updated/deleted; Clear history keeps a running run',
      'PO board: Last refreshed shows date + hour; In view / total follows filters; no D365 start button on the board',
      'Mark as seen works for admin, employee and supplier; change frames disappear for that user only',
      'Failed purchase-orders run marks the run as error; lookup-only failure stays done with entity error',
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
