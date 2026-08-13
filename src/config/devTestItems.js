// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'po-scroll-tier-a',
    title: '#253 Tier A: Scroll quick-wins (rAF-gate, overscan, startTransition, contain)',
    checks: [
      'Verticaal scrollen op het PO-bord verloopt vloeiend zonder merkbare hapering',
      'Snelle wheel/trackpad-scroll toont geen freeze of lange frames (DevTools > Performance)',
      'Rijen worden correct gemount bij alle scrollposities (geen missende rijen)',
      'Scroll-positie springt niet terug na snel scrollen',
      'DevTools console: geen React-warnings over startTransition of measurelabels',
      'perf-HUD (linksonder) toont board:window-update meetpunten bij scrollen',
    ],
  },
  {
    id: 'feature-252-po-scroll-tier-b-v1-47-0',
    title: '#254 Tier B: Scroll deep-wins — kolom-virtualisatie, tooltip, GPU-layer (v1.47.0)',
    checks: [
      'Horizontaal scrollen toont geen misalignment tussen header en body-cellen',
      'Sticky controlekolom (checkbox/expand/badge) blijft zichtbaar bij horizontaal scrollen',
      'Categorie-headers scrollen niet mee — sticky-gedrag werkt correct bij alle scrollposities',
      'Productafbeelding-tooltip verschijnt pas na hoveren (niet meteen bij rij-mount)',
      'Geen zichtbare pop-in van kolommen bij snel horizontaal scrollen',
      'Bij snel verticaal scrollen: geen zichtbare sprong van categorie-header naar gepinde positie',
      'perf-HUD: board:window-update meetpunten aanwezig bij zowel verticaal als horizontaal scrollen',
    ],
  },
  {
    id: 'po-filter-238',
    title: 'PO-board waarde-filter (equals/oneOf combobox) #238',
    checks: [
      'Equals-operator: typen in het filterveld toont typeahead-suggesties uit de boarddata',
      'Equals-operator: klikken op een suggestie vult het veld en filtert correct',
      'Is one of: typen + Enter voegt een chip toe; Apply filtert op alle chips',
      'Is one of: meerdere regels plakken (Excel/D365-stijl) voegt in één keer meerdere chips toe',
      'Is one of: chip verwijderen via de x-knop werkt correct',
      'Cascading: suggesties tonen alleen waarden die nog voorkomen gegeven andere actieve filters',
      'Backward compat: een opgeslagen view met kommagescheiden oneOf-string laadt en filtert correct',
      'Date-kolommen: filter ongewijzigd (geen typeahead, geen chips)',
    ],
  },
  {
    id: 'feature-238-value-filter-ux-v1-47-5',
    title: 'Feature 238 - PO-board value filter UX-fixes (v1.47.5)',
    checks: [
      'Is exactly: klik op suggestie plaatst de waarde direct in het invoervak',
      'Is exactly: tabel filtert direct na klikken op een suggestie (geen Apply nodig)',
      'Is exactly: kolommenumenu blijft open na auto-apply',
      'Clear: kolommenumenu blijft open na Clear',
      'Reopen filter: invoervak toont de actieve filterwaarde, geen suggestie-dropdown',
      'Lange leveranciersnamen: dropdown wordt breder in plaats van over 2 regels',
      'Suggesties: lijst is links uitgelijnd en verticaal scrollbaar',
    ],
  },
  {
    id: 'vendor-scope-remarks-split-v1-43-7',
    title: 'Vendor BI-toegang, remarks scope en bedrijfsnaam in header (v1.43.7)',
    checks: [
      'Vendor ziet alleen eigen data op de BI-pagina (read-only, eigen vendor scope)',
      'Vendor ziet geen New chart knop op de BI-pagina',
      'D365 write-back is uitgeschakeld voor vendor-logins',
      'Vendor kan een opmerking plaatsen op een order in zijn scope (geen Access denied)',
      'Vendor ziet zijn bedrijfsnaam naast Vendor Collaboration App in de header',
      'Bij het openen van het remarks-panel verschijnt een Spinner tijdens laden',
      'Na het plaatsen van een remark is de auteursnaam zichtbaar (email, niet Unknown user)',
      'Admin/employee ziet ook de auteursnaam van vendor-remarks (niet Unknown user)',
      'Remarks panel opent zonder A remarks request is already in progress melding',
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
