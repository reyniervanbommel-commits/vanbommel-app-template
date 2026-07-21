// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'perf-pipeline-v1-3',
    title: 'Perf pipeline v1.3 (board UX)',
    checks: [
      'Footer shows v1.30.34 on DEV',
      'Filter Apply with nonsense value shows empty state quickly (~1s, not ~10s)',
      'Column Text style Bold applies immediately (optimistic UI)',
      'Navigate PO board → RCCP → back: Network shows revision check, not a full PO reload',
      'Scrolling the PO board still reaches all rows',
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
