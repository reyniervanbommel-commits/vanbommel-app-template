'use strict';

const { validateConfig } = require('./RccpSettingsService');

describe('RccpSettingsService.validateConfig openMeasureKey', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
      { columnKey: 'receivedPurchaseQuantity', label: 'Received qty', chartType: 'line', color: '#0078D4', showInChart: true },
    ],
  };

  it('keeps an open measure that points to a configured measure', () => {
    const { valid, config } = validateConfig({ ...base, openMeasureKey: 'receivedPurchaseQuantity' });
    expect(valid).toBe(true);
    expect(config.openMeasureKey).toBe('receivedPurchaseQuantity');
  });

  it('defaults to empty when no open measure is given', () => {
    const { config } = validateConfig(base);
    expect(config.openMeasureKey).toBe('');
  });

  it('resets to empty when the open measure is not among the measures', () => {
    const { config } = validateConfig({ ...base, openMeasureKey: 'somethingRemoved' });
    expect(config.openMeasureKey).toBe('');
  });
});

describe('RccpSettingsService.validateConfig delivery-plan keys', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
    ],
  };

  it('stores delivery-plan defaults on a valid config', () => {
    const { valid, config } = validateConfig(base);
    expect(valid).toBe(true);
    expect(config.deliveryPlanPlannedDateKey).toBe('requestedDeliveryDate');
    expect(config.deliveryPlanOrderedQtyKey).toBe('quantity');
  });

  it('validates delivery-plan keys against the enriched column list', () => {
    const columns = [
      { key: 'requestedDeliveryDate', rccpMeasure: false },
      { key: 'quantity', rccpMeasure: true },
    ];
    const { config } = validateConfig({
      ...base,
      deliveryPlanDeliveredDateKey: 'unknownDate',
      deliveryPlanDeliveredQtyKey: 'requestedDeliveryDate',
    }, columns);
    expect(config.deliveryPlanDeliveredDateKey).toBe('');
    expect(config.deliveryPlanDeliveredQtyKey).toBe('');
  });
});
