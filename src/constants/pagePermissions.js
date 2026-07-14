/** Pagina-rechten voor deze app (supplier portal). */
export const PAGE_PERMISSIONS = Object.freeze([
  {
    id: 'purchase-orders',
    label: 'Purchase orders',
    description: 'Access to the purchase orders overview',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Access to admin: users, analytics and OData',
  },
]);

export const PAGE_PERMISSION_LABELS = Object.fromEntries(
  PAGE_PERMISSIONS.map((p) => [p.id, p.label])
);
