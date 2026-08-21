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
