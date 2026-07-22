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
    id: 'feature-items-d365-sync-filter-v1-36-2',
    title: 'Items D365 sync filter op instellingen (v1.36.2)',
    checks: [
      'Admin > Data model > tab Itemen toont een bewerkbare filterbuilder (Add/Save/Count), niet meer "Inherited"',
      'Vendors en Ontvangstregels blijven read-only inherited',
      'Een hint legt uit dat items beperkt blijven tot itemnummers uit gesyncte inkooporders',
      'Een items-filter opslaan lukt zonder fout; na Sync now komen alleen items binnen die aan filter én PO-scope voldoen',
      '"Count rows" op de Itemen-tab toont het aantal items binnen de PO-scope en het filter',
    ],
  },
  {
    id: 'feature-items-d365-sync-filter-board-v1-36-4',
    title: 'Items D365 sync filter - PO-bord filtering (v1.36.4)',
    checks: [
      'Met een opgeslagen items-filter toont het inkooporder-bord alleen regels waarvan het item aan de filter voldoet',
      'Inkooporders zonder enkele matchende regel worden verborgen op het bord',
      'Zonder items-filter toont het bord alle orders en regels zoals voorheen (geen neveneffect)',
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
