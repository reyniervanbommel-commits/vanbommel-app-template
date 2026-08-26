// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'idle-prefetch-kpi-bi-rccp',
    title: 'Idle prefetch: KPI-tab, BI & RCCP',
    checks: [
      'Open the PO table, wait ~2s without scrolling, open the KPI tab: tiles show non-zero numbers when Open/Delivered are configured in settings.',
      'Scroll fast / type in a column filter while the idle-prefetch would normally run: no noticeable extra stutter compared to before this change.',
      'First click on RCCP with a last-used vendor: chart/KPIs appear without a long empty state (at most a brief JS-chunk load if the prefetch had not finished yet).',
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
