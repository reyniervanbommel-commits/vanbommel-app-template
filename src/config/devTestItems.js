// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
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
