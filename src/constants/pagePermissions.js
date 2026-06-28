/** Pagina-rechten voor deze app (supplier portal). */
export const PAGE_PERMISSIONS = Object.freeze([
  {
    id: 'purchase-orders',
    label: 'Purchase orders',
    description: 'Toegang tot het purchase orders overzicht',
  },
  {
    id: 'admin',
    label: 'Beheer',
    description: 'Toegang tot admin: gebruikers, analytics en OData',
  },
]);

export const PAGE_PERMISSION_LABELS = Object.fromEntries(
  PAGE_PERMISSIONS.map((p) => [p.id, p.label])
);
