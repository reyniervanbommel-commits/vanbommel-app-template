export function isProductAttributeColumn(column) {
  return Boolean(column?.options?.kind === 'product-attribute');
}
