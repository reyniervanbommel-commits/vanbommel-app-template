// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'instant-paginanavigatie',
    title: 'Instant paginanavigatie (keep-alive + versheidscheck)',
    checks: [
      'PO -> RCCP -> PO: het tweede bezoek toont de tabel direct zonder spinner, met behouden scrollpositie, filters en sortering',
      'BI en RCCP komen bij terugkeer eveneens direct terug (geen laadspinner)',
      'RCCP: de gekozen vendor + week komen na wegnavigeren en terugkeren terug, en blijven ook na een harde refresh bewaard',
      'Na een celwijziging op de PO-pagina worden RCCP en BI bij terugkeer ververst; zonder wijziging gebeurt er niets',
      'Een leverancier krijgt geen BI-pagina te zien (rol-respect blijft intact)',
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
