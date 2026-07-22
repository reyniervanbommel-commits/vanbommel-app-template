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
  {
    id: 'feature-perf-subregels-v1-35-0',
    title: 'Performance inkooporder-bord (v1.35.0)',
    checks: [
      'Subregels uitklappen gaat vlot; het bord blijft soepel scrollen, ook bij een order met veel regels',
      'Alles uitklappen loopt niet meer vast en de scroll blijft responsief',
      'Product-afbeeldingen in subregels laden zonder 429-fouten (geen ontbrekende/knipperende thumbnails)',
      'Kolom text-style (bold/cursief/onderstreept) togglen gaat vlot en blijft na een reload behouden',
    ],
  },
  {
    id: 'feature-bi-vendor-filter-v1-37-0',
    title: 'BI page vendor filter (v1.37.0)',
    checks: [
      'The BI page shows a searchable vendor filter (by vendor no. or name) in the toolbar',
      'When a PO board filter on a vendor is active, opening the BI page pre-selects that same vendor',
      'Selecting a vendor filters all charts to that vendor; "All vendors" shows the full dataset again',
    ],
  },
  {
    id: 'feature-bi-date-filter-v1-37-7',
    title: 'BI page generic week/year date filter (v1.37.7)',
    checks: [
      'The BI toolbar has a "Week filter" switch plus From/To year and week inputs (like RCCP)',
      'Enabling it filters every chart that uses a date as its dimension to that week range',
      'Charts without a date dimension are unaffected by the week filter',
      'A small refresh button next to the inputs applies the changed weeks',
      'The filter setting (on/off + weeks) is shared: it persists after reload and applies to every user',
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
