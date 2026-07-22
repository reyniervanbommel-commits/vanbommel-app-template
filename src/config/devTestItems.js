// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
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
