// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'fix-d365-date-type-v1-52-99',
    title: 'D365 date fields as Date (v1.52.99)',
    checks: [
      'Data model: Confirmed Delivery Date shows type Date (not Text).',
      'RCCP settings → Data: Confirmed Delivery Date is selectable for Requested and Confirmed delivery date.',
      'PO table: date filter on Confirmed Delivery Date matches the calendar day, without hours/minutes.',
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
