// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-267-live-cell-history-fold-v1-51-47',
    title: 'Feature 267 - Live history fold after cell edit (v1.51.47)',
    checks: [
      'Edit a cell that had no history fold: the fold appears without page refresh',
      'Click the fold: existing history popover opens',
      'Force a failed save: value and fold roll back together',
      'History indicators off: no fold after save',
      'Cell that already had a fold: fold stays visible',
    ],
  },
  {
    id: '269-rccp-chart-po-segments',
    title: 'RCCP chart: PO boxes, Today, late',
    checks: [
      'On /rccp the Capacity vs load chart shows wide PO boxes (not thin week totals).',
      'Received boxes appear above on the planned week and below the axis on the receipt date.',
      'Hovering a box shows PO, status, quantity and week in English; boxes are not clickable.',
      'A Today line sits on the real weekday of the current ISO week (none if that week is off-screen).',
      'Open boxes from weeks before the current ISO week have a red outline; current-week open boxes do not.',
    ],
  },
  {
    id: 'feature-269-rccp-kpi-split-v1-51-64',
    title: 'Feature 269 - RCCP KPI tiles and PO split pane (v1.51.64)',
    checks: [
      'RCCP dashboard shows volume, late, on-time and capacity KPI tiles; percentages use one decimal.',
      'Switch “KPIs in selected weeks” on: tiles follow the week window; off: tiles use all weeks. Chart stays on the window.',
      'PO board KPIs tab: same tiles, clickable (except capacity on this tab); click filters the table.',
      'PO KPI tiles stay empty/unfetched until the KPIs tab is opened; Charts and RCCP tabs only load when selected.',
      'Split pane remembers height per tab after resize and reopen.',
      'Late delivery and on-time tiles show units as percent of ordered.',
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
