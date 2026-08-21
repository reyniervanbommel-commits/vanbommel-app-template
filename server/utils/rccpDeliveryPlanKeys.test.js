'use strict';

const { normalizeDeliveryPlanKeys } = require('./rccpDeliveryPlanKeys');

const columns = [
  { key: 'requestedDeliveryDate', rccpMeasure: false },
  { key: 'productReceiptDate', rccpMeasure: false },
  { key: 'quantity', rccpMeasure: true },
  { key: 'receivedPurchaseQuantity', rccpMeasure: true },
  { key: 'notes', rccpMeasure: false },
];

describe('normalizeDeliveryPlanKeys', () => {
  it('applies defaults without a column registry', () => {
    const keys = normalizeDeliveryPlanKeys({});
    expect(keys.deliveryPlanPlannedDateKey).toBe('requestedDeliveryDate');
    expect(keys.deliveryPlanDeliveredDateKey).toBe('productReceiptDate');
    expect(keys.deliveryPlanOrderedQtyKey).toBe('quantity');
    expect(keys.deliveryPlanDeliveredQtyKey).toBe('receivedPurchaseQuantity');
  });

  it('keeps valid keys that exist on the enriched list', () => {
    const keys = normalizeDeliveryPlanKeys({
      deliveryPlanPlannedDateKey: 'productReceiptDate',
      deliveryPlanDeliveredDateKey: 'requestedDeliveryDate',
      deliveryPlanOrderedQtyKey: 'receivedPurchaseQuantity',
      deliveryPlanDeliveredQtyKey: 'quantity',
    }, columns);
    expect(keys.deliveryPlanPlannedDateKey).toBe('productReceiptDate');
    expect(keys.deliveryPlanOrderedQtyKey).toBe('receivedPurchaseQuantity');
  });

  it('falls back when a date key is missing or a qty key is not an rccpMeasure', () => {
    const keys = normalizeDeliveryPlanKeys({
      deliveryPlanPlannedDateKey: 'doesNotExist',
      deliveryPlanDeliveredDateKey: 'notes',
      deliveryPlanOrderedQtyKey: 'notes',
      deliveryPlanDeliveredQtyKey: 'missing',
    }, columns);
    expect(keys.deliveryPlanPlannedDateKey).toBe('requestedDeliveryDate');
    expect(keys.deliveryPlanDeliveredDateKey).toBe('notes');
    expect(keys.deliveryPlanOrderedQtyKey).toBe('quantity');
    expect(keys.deliveryPlanDeliveredQtyKey).toBe('');
  });

  it('keeps an explicit empty delivered key', () => {
    const keys = normalizeDeliveryPlanKeys({
      deliveryPlanDeliveredDateKey: '',
      deliveryPlanDeliveredQtyKey: '',
    }, columns);
    expect(keys.deliveryPlanDeliveredDateKey).toBe('');
    expect(keys.deliveryPlanDeliveredQtyKey).toBe('');
  });
});
