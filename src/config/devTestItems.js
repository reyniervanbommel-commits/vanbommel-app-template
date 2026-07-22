// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-perf-subregels-v1-31-0',
    title: 'Performance inkooporder-bord (v1.31.0)',
    checks: [
      'Subregels uitklappen gaat vlot; het bord blijft soepel scrollen, ook bij een order met veel regels',
      'Alles uitklappen loopt niet meer vast en de scroll blijft responsief',
      'Product-afbeeldingen in subregels laden zonder 429-fouten (geen ontbrekende/knipperende thumbnails)',
      'Kolom text-style (bold/cursief/onderstreept) togglen gaat vlot en blijft na een reload behouden',
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
