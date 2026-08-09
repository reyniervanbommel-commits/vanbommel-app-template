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
  {
    id: 'feature-bi-fast-loading-v1-40-0',
    title: 'BI faster loading & caching (v1.40.0)',
    checks: [
      'Returning to the BI page renders charts instantly from cache (no full reload) when nothing changed',
      'Changing vendor or week filter updates charts quickly without a noticeable full board reload',
      'After a data refresh/sync the BI charts show the new data on the next visit',
      'Opening BI still shows correct columns in the chart builder (metadata loads without a full read)',
    ],
  },
  {
    id: 'instant-paginanavigatie-v1-41-0',
    title: 'Instant paginanavigatie (keep-alive + versheidscheck) (v1.41.0)',
    checks: [
      'PO -> RCCP -> PO: het tweede bezoek toont de tabel direct zonder spinner, met behouden scrollpositie, filters en sortering',
      'BI en RCCP komen bij terugkeer eveneens direct terug (geen laadspinner)',
      'RCCP: de gekozen vendor + week komen na wegnavigeren en terugkeren terug, en blijven ook na een harde refresh bewaard',
      'Na een celwijziging op de PO-pagina worden RCCP en BI bij terugkeer ververst; zonder wijziging gebeurt er niets',
      'Een leverancier krijgt geen BI-pagina te zien (rol-respect blijft intact)',
    ],
  },
  {
    id: 'test-coverage-security-core-v1-33-0',
    title: 'Vitest-testdekking security-kern (auth, sessies, PO-board hooks) (v1.33.0)',
    checks: [
      'Inloggen, uitloggen, wachtwoord vergeten/resetten en account-vergrendeling na 3 mislukte pogingen werken zoals voorheen (geen gedragswijziging, alleen nieuwe tests)',
      'Supplier-gebruikers zien nog steeds alleen hun eigen inkooporders op het bord en in RCCP',
      'PO-board: groeperen, bulk-bewerken van geselecteerde orders, en de Excel-koppeling-wizard (Admin > Data model) werken ongewijzigd',
      'Admin > Data model: kolom-toggles (zichtbaarheid/writeback/RCCP-measure) en bulk-toggle werken ongewijzigd',
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
