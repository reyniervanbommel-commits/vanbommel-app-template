// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-view-tab-overflow-v1-52-66',
    title: 'View tab bar overflow (v1.52.66)',
    checks: [
      'When there are many view tabs, chevrons appear and tabs scroll instead of wrapping',
      'Tabs can be dragged to reorder while the overflow scroller stays usable',
    ],
  },
  {
    id: 'feature-column-source-menu-v1-52-66',
    title: 'Column source in column menu (v1.52.66)',
    checks: [
      'Column menu shows the column source and connected status',
    ],
  },
  {
    id: 'feature-tab-session-filters-v1-52-66',
    title: 'Unsaved table state stays in the tab session (v1.52.66)',
    checks: [
      'Filter, sort and grouping stay after switching tabs until the tab is closed',
    ],
  },
  {
    id: 'feature-push-to-header-datamodel-v1-52-66',
    title: 'Push-to-header columns on data model (v1.52.66)',
    checks: [
      'Push-to-header columns are marked on the data model admin screen',
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
