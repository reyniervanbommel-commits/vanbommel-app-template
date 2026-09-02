// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'bulk-writeback-conflicts-295',
    title: 'Bulk write-back per-row outcome and retry (#295)',
    checks: [
      'Bulk-edit a D365-writable column on 3 selected rows where the middle row fails: rows 1 and 3 still update; summary lists the failed PO and D365 error',
      'Retry on a resolved failed row removes it from the list and updates Failed: N',
      'Retry all failed runs remaining failed rows sequentially',
      'Bulk-edit without failures still closes the dialog silently',
      'Bulk-edit on a non-D365 column still stops on first error with the old summary text (no retry list)',
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
