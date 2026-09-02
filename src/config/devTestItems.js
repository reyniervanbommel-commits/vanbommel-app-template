// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'bulk-writeback-conflicts-295',
    title: 'Bulk write-back per-row outcome and retry (#295)',
    checks: [
      'Apply to selected rows on a D365 column closes the confirm dialog immediately; a header badge shows Write-back n/total',
      'Locked cells are only the selected rows in that one column (queued tint, writing spinner); other columns stay editable',
      'A second bulk write-back is blocked until the first job finishes',
      'When every row succeeds the badge disappears and a green toast appears',
      'When a row fails the badge stays, the result panel lists the PO and D365 error, and Retry / Retry all failed work',
      'Selecting 25+ rows shows the one-by-one warning in the confirm dialog',
      'Bulk-edit on a non-D365 column still blocks the dialog and stops on first error (no background job)',
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
