// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
export const devTestItems = [
  {
    id: 'feature-202-upload-performance-v1-14-44',
    title: 'Feature 202 - Upload performance verbetering (v1.14.44)',
    checks: [
      'Upload van een groter Excel-bestand start en rondt merkbaar sneller af dan voorheen',
      'Na upload verschijnen dataset-label, rij-aantal en kolommen correct in de wizard',
      'Publiceren van de koppeling werkt nog steeds zonder fouten na de performance-aanpassing',
      'Bulk-edit functionaliteit uit Feature 202 blijft ongewijzigd werken op header-cellen',
    ],
  },
  {
    id: 'feature-202-bulk-edit-geselecteerde-rijen-v1-14-43',
    title: 'Feature 202 - Bulk bewerken geselecteerde rijen (v1.14.43)',
    checks: [
      'Bij 1 geselecteerde zichtbare rij wordt direct opgeslagen zonder modal',
      'Bij meerdere zichtbare geselecteerde rijen verschijnt modal met Alleen deze cel / Toepassen op geselecteerde rijen',
      'Bulk op header-cellen werkt voor custom save en D365 write-back; regelcellen blijven single-update',
      'Bij write-back worden rijen met dezelfde waarde overgeslagen (geen overbodige D365-call)',
      'Bij fout stopt bulk direct en toont samenvatting met bijgewerkt, overgeslagen en niet geprobeerd',
    ],
  },
  {
    id: 'feature-178-image-column-main-table',
    title: 'Feature 178 - Plaatje-kolom in main tabel',
    checks: [
      'Via kolommenu kan type Plaatje worden gekozen en geconfigureerd met urlTemplate + bronkolom',
      'Nieuwe plaatje-kolom rendert read-only afbeeldingen per rij op basis van de bronkolomwaarde',
      'Ongeldige template of ontbrekende bronwaarde veroorzaakt geen crash en toont geen gebroken afbeelding',
      'Sorteren en filteren op een plaatje-kolom is niet beschikbaar in het kolommenu',
      'Externe https-afbeeldingen laden in preview/DEV met CSP-header img-src self,data,https',
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
    id: 'feature-178-image-column-ux-v1-0-7',
    title: 'Feature 178 - Plaatjekolom UX-afwerking (v1.0.7)',
    checks: [
      'Plaatje-thumbnail vult de cel tot aan de randen zonder de rijhoogte op te rekken',
      'Klik op plaatje opent popup met grote preview en broninformatie (alleen originele waarde)',
      'Popup toont geen extra linked-table blok, bronkolom of na-transformatie regel meer',
      'Plaatjekolom blijft read-only en menu-acties veroorzaken geen layout-sprongen in de tabel',
    ],
  },
];
