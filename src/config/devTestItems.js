// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-295-bulk-writeback-conflicts-v1-53-3',
    title: 'Feature 295 - Bulk write-back background job (v1.53.3)',
    checks: [
      'Apply to selected rows on a D365 column closes the confirm dialog immediately; header badge shows Write-back n/total with the D365 icon',
      'Locked cells are only the selected rows in that one column (queued tint, writing spinner inside the cell); other columns stay editable',
      'A second bulk write-back is blocked until the first job finishes',
      'When every row succeeds the header badge shows Write-back complete, then disappears',
      'When a row fails the badge stays, the result panel lists the PO and D365 error, and Retry / Retry all failed work',
      'Selecting 25+ rows shows the one-by-one warning in the confirm dialog',
      'Bulk-edit on a non-D365 column still blocks the dialog and stops on first error (no background job)',
      'Going to Settings while a job runs keeps the badge and the batch going; closing the tab stops it',
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
