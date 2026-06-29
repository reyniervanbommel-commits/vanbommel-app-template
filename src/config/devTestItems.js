export const devTestItems = [
  {
    id: 'story-132',
    title: 'Story #132 - PO SQL-cache + dynamische kolommen (Fase 1)',
    checks: [
      'Purchase orders laden uit de SQL-cache (geen live D365 bij paginaload)',
      'Vernieuwen-knop ververst uit D365 en toont nieuwe sync-tijd',
      'Versheidsindicator toont Actueel/Verouderd/Nog-niet-gesynchroniseerd',
      'Eigen kolom toevoegen op hoofd- en regelniveau (tekst/getal/datum/ja-nee/keuzelijst)',
      'Eigen kolomwaarde inline bewerken slaat direct op (autosave)',
      'Eigen kolom hernoemen en verwijderen (soft-delete; waarden blijven behouden)',
    ],
  },
  {
    id: 'ticket-75',
    title: 'Story #75 - Auth en rollen voor leveranciers en VB medewerkers',
    checks: [
      'Supplier rol kan alleen supplier-routes bereiken',
      'Employee en admin hebben toegang tot interne beheerpagina',
      'Backend valideert rolwaarden en weigert onbekende rollen',
      'Sessie bevat alleen veilige user velden zonder password hash',
    ],
  },
];
