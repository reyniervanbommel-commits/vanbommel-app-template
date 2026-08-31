'use strict';

const { normalizeChartWeekRanges, normalizeQuantityMeasures, validateConfig } = require('./RccpSettingsService');

describe('RccpSettingsService.validateConfig openMeasureKey', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
      { columnKey: 'receivedPurchaseQuantity', label: 'Received qty', chartType: 'line', color: '#0078D4', showInChart: true },
    ],
  };

  it('keeps an open measure that is set explicitly', () => {
    const { valid, config } = validateConfig({
      ...base,
      openMeasureKey: 'quantity',
      deliveredMeasureKey: 'receivedPurchaseQuantity',
      orderedMeasureKey: 'remainingPurchaseQuantity',
    });
    expect(valid).toBe(true);
    expect(config.openMeasureKey).toBe('quantity');
  });

  it('defaults open/received/ordered to the slot keys', () => {
    const { config } = validateConfig(base);
    expect(config.openMeasureKey).toBe('remainingPurchaseQuantity');
    expect(config.deliveredMeasureKey).toBe('receivedPurchaseQuantity');
    expect(config.orderedMeasureKey).toBe('quantity');
    expect(config.quantityMeasures.map((m) => m.columnKey)).toEqual([
      'remainingPurchaseQuantity', 'receivedPurchaseQuantity', 'quantity',
    ]);
  });

  it('rejects duplicate quantity slots', () => {
    const { valid, error } = validateConfig({
      ...base,
      openMeasureKey: 'quantity',
      deliveredMeasureKey: 'quantity',
      orderedMeasureKey: 'remainingPurchaseQuantity',
    });
    expect(valid).toBe(false);
    expect(error).toBe('Each quantity slot must use a different column');
  });

  it('maps remainingMeasureKey to orderedMeasureKey', () => {
    const { config } = validateConfig({
      ...base,
      remainingMeasureKey: 'quantity',
      openMeasureKey: 'remainingPurchaseQuantity',
      deliveredMeasureKey: 'receivedPurchaseQuantity',
    });
    expect(config.orderedMeasureKey).toBe('quantity');
    expect(config.remainingMeasureKey).toBeUndefined();
  });

  it('preserves measure color when the column is reused', () => {
    const { config } = validateConfig({
      ...base,
      openMeasureKey: 'remainingPurchaseQuantity',
      deliveredMeasureKey: 'receivedPurchaseQuantity',
      orderedMeasureKey: 'quantity',
    });
    expect(config.quantityMeasures.find((m) => m.columnKey === 'quantity').color).toBe('#d13438');
  });
});

describe('RccpSettingsService.validateConfig receiptDateColumnKey', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
    ],
  };

  it('defaults to an empty receipt date key', () => {
    const { valid, config } = validateConfig(base);
    expect(valid).toBe(true);
    expect(config.receiptDateColumnKey).toBe('');
  });

  it('keeps a valid receipt date column key', () => {
    const { valid, config } = validateConfig({ ...base, receiptDateColumnKey: 'productReceiptDate' });
    expect(valid).toBe(true);
    expect(config.receiptDateColumnKey).toBe('productReceiptDate');
  });

  it('trims whitespace on the receipt date key', () => {
    const { config } = validateConfig({ ...base, receiptDateColumnKey: '  productReceiptDate  ' });
    expect(config.receiptDateColumnKey).toBe('productReceiptDate');
  });

  it('rejects a receipt date key longer than 128 characters', () => {
    const { valid, error } = validateConfig({ ...base, receiptDateColumnKey: 'a'.repeat(129) });
    expect(valid).toBe(false);
    expect(error).toBe('receiptDateColumnKey must be at most 128 characters');
  });

  it('rejects a receipt date key with invalid characters', () => {
    const { valid, error } = validateConfig({ ...base, receiptDateColumnKey: 'product-receipt' });
    expect(valid).toBe(false);
    expect(error).toBe('receiptDateColumnKey may only contain letters, numbers and underscores');
  });
});

describe('RccpSettingsService.validateConfig confirmedDateColumnKey', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
    ],
  };

  it('defaults to an empty confirmed date key', () => {
    const { valid, config } = validateConfig(base);
    expect(valid).toBe(true);
    expect(config.confirmedDateColumnKey).toBe('');
  });

  it('keeps a valid confirmed date column key', () => {
    const { valid, config } = validateConfig({ ...base, confirmedDateColumnKey: 'confirmedDeliveryDate' });
    expect(valid).toBe(true);
    expect(config.confirmedDateColumnKey).toBe('confirmedDeliveryDate');
  });

  it('rejects a confirmed date key longer than 128 characters', () => {
    const { valid, error } = validateConfig({ ...base, confirmedDateColumnKey: 'a'.repeat(129) });
    expect(valid).toBe(false);
    expect(error).toBe('confirmedDateColumnKey must be at most 128 characters');
  });

  it('rejects a confirmed date key with invalid characters', () => {
    const { valid, error } = validateConfig({ ...base, confirmedDateColumnKey: 'product-receipt' });
    expect(valid).toBe(false);
    expect(error).toBe('confirmedDateColumnKey may only contain letters, numbers and underscores');
  });
});

describe('RccpSettingsService.validateConfig itemPickerColumnKeys', () => {
  const base = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [
      { columnKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
    ],
  };

  it('defaults to an empty item picker column list', () => {
    const { valid, config } = validateConfig(base);
    expect(valid).toBe(true);
    expect(config.itemPickerColumnKeys).toEqual([]);
  });

  it('keeps unique item-entity columns after the item number', () => {
    const { config } = validateConfig({
      ...base,
      itemPickerColumnKeys: ['productName', 'itemNumber', 'productName', ' color '],
    });
    expect(config.itemPickerColumnKeys).toEqual(['productName', 'color']);
  });

  it('drops keys that are not safe column identifiers', () => {
    const { config } = validateConfig({
      ...base,
      itemPickerColumnKeys: ['product-name', 'searchName'],
    });
    expect(config.itemPickerColumnKeys).toEqual(['searchName']);
  });
});

describe('RccpSettingsService color opacity', () => {
  it('behoudt 8-cijferige hex-kleuren op measures en week ranges', () => {
    expect(normalizeQuantityMeasures({
      quantityMeasures: [{ columnKey: 'quantity', color: '#e2445cb3' }],
    })[0].color).toBe('#e2445cb3');
    expect(normalizeChartWeekRanges({
      chartWeekRanges: [{
        fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8, color: '#579bfcb3',
      }],
    })[0].color).toBe('#579bfcb3');
  });
});
