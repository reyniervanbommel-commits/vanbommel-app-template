// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-187-formule-functies-today-v1-33-0',
    title: 'Feature 187 - TODAY(), AFRONDEN/ROUND, ABS, MAX, MIN functies (v1.33.0)',
    checks: [
      'TODAY() geeft de huidige datum terug in een formule, bijv. =(TODAY())-(leverdatum)',
      'AFRONDEN/ROUND rondt een getal correct af op het gekozen aantal decimalen',
      'ABS, MAX en MIN geven de juiste uitkomst in een formulekolom',
      'IF werkt als Engelse alias van ALS',
    ],
  },
  {
    id: 'feature-187-netwerkdagen-live-update-v1-33-0',
    title: 'Feature 187 - NETWERKDAGEN + live update na cel-edit (v1.33.0)',
    checks: [
      'NETWERKDAGEN((start);(eind)) / NETWORKDAYS telt alleen werkdagen, weekend telt niet mee',
      'Na het wijzigen van een datum die in een formule wordt gebruikt, update de formulekolom direct zonder page refresh',
      'Bewerken van een formulekolom zelf blijft geblokkeerd (read-only)',
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
