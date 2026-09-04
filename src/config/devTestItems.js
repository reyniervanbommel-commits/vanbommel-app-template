// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-311-product-attribute-values-v1-53-15',
    title: 'Feature 311 - Product attribute values (v1.53.15)',
    checks: [
      'Data model tab Product attribute values syncs rows for items already in the Items cache',
      'PO Board columns lists all attribute names (not only Sole name) with switches',
      'Visible on PO board adds a line column; two unique values show first + N with hover list',
      'Line cell shows Attribute value, or Text value when Attribute value is empty',
      'Product number shows a yellow Items · ItemNumber badge',
      'Data model entities (PO header/line, PAV, vendors, items, PRL) use a harmonica; checked columns sort to the top',
      'Switching Data model entity tabs remounts the harmonica so open/closed state is not reused',
      'Employee cannot open /api/data/product-attribute-values',
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
