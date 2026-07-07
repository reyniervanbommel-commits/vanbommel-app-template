// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
export const devTestItems = [
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
];
