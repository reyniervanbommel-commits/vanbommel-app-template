// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: '258-rccp-delivery-plan',
    title: 'RCCP Delivery plan tab',
    checks: [
      'Open /rccp and confirm the Delivery plan tab sits next to Dashboard and Capacity planning',
      'Dashboard and Capacity planning still work as before',
      'Week range fields are visible on Dashboard and Delivery plan',
      'Choose a vendor on Delivery plan and confirm the chart loads live PO lines',
      'Hover a segment: detail line and tooltip show order, line, quantities, dates and variance (never 0w)',
      'Admin: Settings → Delivery plan has four column dropdowns; Save reloads the tab',
      'Supplier sees only their own vendor and cannot change settings',
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
