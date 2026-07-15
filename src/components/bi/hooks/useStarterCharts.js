import { useCallback } from 'react';
import { BOARD_KEY, createEmptyChartConfig } from '../biConstants';

// Zoekt de eerste kolom waarvan key of label een van de zoektermen bevat (case-insensitive).
function findColumn(columns, { dataType, keywords }) {
  const candidates = dataType ? columns.filter((col) => col.dataType === dataType) : columns;
  for (const keyword of keywords) {
    const match = candidates.find((col) => `${col.key} ${col.label}`.toLowerCase().includes(keyword));
    if (match) return match;
  }
  return candidates[0] || null;
}

/**
 * Levert een functie die een starter-dashboard aanmaakt (#AB:223): KPI totaalbedrag,
 * bar bedrag per leverancier, line bedrag per maand, pie aantal orders per status.
 * Kolommen worden heuristisch afgeleid uit de beschikbare metadata; ontbrekende charts
 * worden overgeslagen. @returns {() => Promise<number>} aantal aangemaakte charts.
 */
export function useStarterCharts({ columns, createChart }) {
  return useCallback(async () => {
    const amountCol = findColumn(columns, { dataType: 'number', keywords: ['amount', 'bedrag', 'total', 'price', 'value'] });
    const vendorCol = findColumn(columns, { dataType: null, keywords: ['vendorname', 'vendor', 'leverancier', 'supplier', 'account'] });
    const dateCol = findColumn(columns, { dataType: 'date', keywords: ['order', 'delivery', 'date', 'datum'] });
    const statusCol = findColumn(columns, { dataType: null, keywords: ['status', 'state'] });

    const starters = [];
    if (amountCol) {
      starters.push({
        name: 'Total purchase amount',
        visibility: 'shared',
        config: { ...createEmptyChartConfig(), type: 'kpi', measure: amountCol.key, aggregation: 'sum' },
      });
    }
    if (amountCol && vendorCol) {
      starters.push({
        name: 'Amount per vendor',
        visibility: 'shared',
        config: { ...createEmptyChartConfig(), type: 'bar', dimension: vendorCol.key, measure: amountCol.key, aggregation: 'sum' },
      });
    }
    if (amountCol && dateCol) {
      starters.push({
        name: 'Amount per month',
        visibility: 'shared',
        config: { ...createEmptyChartConfig(), type: 'line', dimension: dateCol.key, measure: amountCol.key, aggregation: 'sum', dateGrouping: 'month' },
      });
    }
    if (statusCol) {
      starters.push({
        name: 'Orders per status',
        visibility: 'shared',
        config: { ...createEmptyChartConfig(), type: 'pie', dimension: statusCol.key, aggregation: 'count' },
      });
    }

    for (const starter of starters) {
      // eslint-disable-next-line no-await-in-loop
      await createChart({ ...starter, boardKey: BOARD_KEY });
    }
    return starters.length;
  }, [columns, createChart]);
}
