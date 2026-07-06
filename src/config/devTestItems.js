// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
export const devTestItems = [
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
];
