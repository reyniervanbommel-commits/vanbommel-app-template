// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
export const devTestItems = [
  {
    id: 'feature-196-admin-baseline-v1-0-7',
    title: 'Feature 196 - Admin-only refresh en baseline (v1.0.7)',
    checks: [
      'Refresh vanuit D365 is alleen uitvoerbaar voor admin; niet-admin ziet de knop disabled',
      'Markeer als gezien is alleen uitvoerbaar voor admin; niet-admin kan niet afvinken',
      'Na admin-afvinken zien alle gebruikers dezelfde reset van nieuw/gewijzigd tellingen',
      'Na een tweede refresh zonder bronwijziging blijft gewijzigd stabiel en loopt niet kunstmatig op',
    ],
  },
  {
    id: 'feature-196-d365-diff-ledger',
    title: 'Feature 196 - D365 diff + change ledger',
    checks: [
      'Na refresh zijn nieuwe/gewijzigde orders zichtbaar en celniveau highlights tonen gewijzigde header-velden',
      'Nieuwe, gewijzigde en verwijderde line-items tonen statusbadge en celhighlight op changedFieldKeys',
      'Markeer als gezien verwijdert highlights op order-, line- en celniveau voor de ingelogde gebruiker',
      'Write acties (custom value, D365 correctie, rij verbergen/terugzetten) schrijven events naar tb_change_ledger',
      'Topbar legenda komt overeen met prioriteit: verwijderd > nieuw > gewijzigd',
    ],
  },
  {
    id: 'perf-frontend-timing',
    title: 'Performance: compressie, code-splitting + timing-infra (#AB:142)',
    checks: [
      'Eerste laadtijd: DevTools → Network toont gecomprimeerde, opgesplitste JS-chunks (niet één grote bundle)',
      'Het board opent normaal; /admin laadt pas dán de grafiek-chunk (vendor-charts)',
      'DevTools → Network → een /api-call → tab Timing toont Server-Timing (app + tb_read_sql)',
      'De ⚡ perf-HUD linksonder toont laadtijd + recente API-calls (alleen op DEV/preview, niet PROD)',
      'Console toont per API-call de duur ([api] GET ... → 200 in Nms)',
    ],
  },
  {
    id: 'feature-187-formulekolom',
    title: 'Feature 187 - Formulekolom rechts toevoegen',
    checks: [
      'Nieuwe formulekolom kan rechts van een bestaande kolom worden toegevoegd',
      'Formule met ALS en kolomrefs wordt server-side berekend en read-only getoond',
      'Bij formulefout blijft cel leeg en is foutreden zichtbaar via tooltip',
      'Voorwaardelijke opmaak (cel of rij) op formule-uitkomst werkt met eerste match',
      'Tweede rij-opmaakdoel wordt geweigerd en bestaande rij-opmaak blijft leidend',
    ],
  },
  {
    id: 'feature-187-formulekolom-linked-total-v1-0-7',
    title: 'Feature 187 - Formule op linked totaal kolom (v1.0.7)',
    checks: [
      'Formule (aantal_total_2)*2 gebruikt de actuele line-total waarde en niet standaard 0',
      'Na opslaan van formulekolom worden rijwaarden direct opnieuw geladen op de boardpagina',
      'Formulekolommen op linked headerkolommen tonen verwachte numerieke uitkomst per rij',
    ],
  },
  {
    id: 'feature-195-vendors-items-datamodel-v1-14-37',
    title: 'Feature 195 - Vendors/Items data model and PO lookup enrichment',
    checks: [
      'Admin > Data model shows tabs for Purchase Orders, Vendors and Items, each with configurable columns and sync filters',
      'Purchase Orders data model shows a relations overview including 1:n header-line and n:1 lookups to Vendors and Items',
      'After syncing vendors/items and then purchase orders, the PO board shows read-only lookup columns for vendor name and item name',
      'Vendors and Items datamodel pages support refresh, sample preview and Excel export without errors',
      'No regression in existing PO flow: table loads, column toggles work, and write-back controls stay available only where allowed',
    ],
  },
  {
    id: 'feature-sync-retained-orders',
    title: 'Sync-retained orders outside hard D365 filter',
    checks: [
      'After refresh, a PO that left the hard sync filter (e.g. Open → Delivered) stays visible on the board',
      'Retained PO data updates on the next D365 refresh (status/fields from D365)',
      'Hiding a row clears retention; the PO is no longer fetched in phase 2',
      'Changing sync filters in Data model clears retained count',
      'Admin Data model shows retained order count when > 0',
    ],
  },
  {
    id: 'feature-203-d365-product-images',
    title: 'Feature 203 - D365 productafbeeldingen (v1.14.135)',
    checks: [
      'Elke zichtbare, niet-verwijderde orderregel met een itemnummer toont een productthumbnail via de same-origin media-route',
      'De orderheader toont het eerste zichtbare item en +1 wanneer drie regels twee unieke itemnummers bevatten',
      'Een ontbrekende productafbeelding blijft rustig leeg zonder broken-image-icoon',
      'Een niet-geautoriseerde request naar /api/media/product-image wordt geweigerd',
    ],
  },
];
