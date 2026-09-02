// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-302-header-push-line-writeback-v1-52-128',
    title: 'Feature 302 - Header write-back of pushed D365 line values (v1.52.128)',
    checks: [
      'Staff can edit a Push values to header column when the source line column has D365 write-back on',
      'Saving from that header writes the value to all lines of that PO (also when the cell shows +N)',
      'With multiple header rows selected, editing a pushed cell asks This cell only vs Apply to selected rows',
      'A D365 write-back icon is visible on the pushed writable header column',
      'After a successful header write-back, expanded lines show a history fold on every updated line',
      'Suppliers cannot edit the pushed header (read-only, no write-back)',
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
