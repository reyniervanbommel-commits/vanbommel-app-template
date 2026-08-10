// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'BL-004-scroll-jank',
    title: 'BL-004: PO-bord scroll-jank fix (rAF-gate)',
    checks: [
      'Verticaal scrollen op het PO-bord verloopt vloeiend zonder merkbare hapering',
      'Snelle wheel/trackpad-scroll toont geen freeze of lange frames (DevTools > Performance)',
      'Rijen worden correct gemount bij alle scrollposities (geen missende rijen)',
      'Scroll-positie springt niet terug na snel scrollen',
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
