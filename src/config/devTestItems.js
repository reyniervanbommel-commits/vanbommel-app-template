// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-307-po-order-filter-rccp-v1-52-128',
    title: 'Feature 307 - PO order filter drives RCCP (v1.52.128)',
    checks: [
      'Order column filter limits the RCCP strip to those purchase-order stacks',
      'Status or KPI filter also limits the strip to the visible rows',
      'Clearing filters restores the full vendor load on the strip',
      'One shared vendor without a vendor column filter auto-loads the strip',
      'Two vendors in view: no auto-vendor',
      '/rccp vendor field is pre-filled; the chart stays vendor-wide (no silent PO subset)',
      'Matrix click does not open a drill-down panel',
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
