import {
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_CONFIRMED_DELIVERY_MEASURE_KEY,
  RCCP_OVERCAPACITY_MEASURE_KEY,
} from './rccpUtils';

function qtyInWeek(cells, year, week, measureKey) {
  let qty = 0;
  for (const cell of cells || []) {
    if (cell.measureKey !== measureKey) continue;
    if (Number(cell.periodYear) !== Number(year) || Number(cell.isoWeek) !== Number(week)) continue;
    qty += Number(cell.confirmedQty) || 0;
  }
  return qty;
}

function capacityKpisFromChart(chart) {
  let capacityShortfall = 0;
  let overloadedWeeks = 0;
  for (const point of chart || []) {
    const capacity = Number(point[RCCP_CAPACITY_MEASURE_KEY]) || 0;
    const over = Number(point[RCCP_OVERCAPACITY_MEASURE_KEY]);
    const load = capacity - over;
    if (load > capacity) {
      capacityShortfall += load - capacity;
      overloadedWeeks += 1;
    }
  }
  return { capacityShortfall, overloadedWeeks };
}

/**
 * Instant Planning-date view: requested analysis stays as-is. Confirmed remaps
 * overcapacity (capacity − confirmed-delivery load) and swaps PO KPIs. Chart
 * stacks are remapped separately after the history overlay.
 */
export function applyRccpPlanningDateView(analysis, planningDate) {
  if (!analysis || planningDate !== 'confirmed') return analysis;

  const cells = (analysis.cells || []).map((cell) => {
    if (cell.measureKey !== RCCP_OVERCAPACITY_MEASURE_KEY) return cell;
    const available = Number(cell.availableQty) || 0;
    const load = qtyInWeek(
      analysis.cells, cell.periodYear, cell.isoWeek, RCCP_CONFIRMED_DELIVERY_MEASURE_KEY,
    );
    const over = available - load;
    return {
      ...cell,
      confirmedQty: over,
      remainingQty: over,
      statusColor: over < 0 ? 'red' : 'green',
      statusLabel: over < 0 ? 'Shortage' : 'OK',
    };
  });

  const chart = (analysis.chart || []).map((point) => {
    const capacity = Number(point[RCCP_CAPACITY_MEASURE_KEY]) || 0;
    const load = qtyInWeek(cells, point.year, point.week, RCCP_CONFIRMED_DELIVERY_MEASURE_KEY);
    return {
      ...point,
      [RCCP_OVERCAPACITY_MEASURE_KEY]: capacity - load,
      __overloaded__: capacity > 0 && load > capacity,
    };
  });

  const capKpis = capacityKpisFromChart(chart);
  const poKpis = analysis.kpisConfirmed || analysis.kpis || {};
  const poKpisAll = analysis.kpisAllConfirmed || analysis.kpisAll || analysis.kpis || {};
  return {
    ...analysis,
    cells,
    chart,
    kpis: { ...poKpis, ...capKpis },
    kpisAll: { ...poKpisAll, ...capKpis },
  };
}
