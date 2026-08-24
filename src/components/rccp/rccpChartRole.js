/**
 * Eén kolom kan open-load of received zijn — nooit allebei.
 * @param {string} openKey
 * @param {string} deliveredKey
 * @param {string} columnKey
 * @param {''|'open'|'delivered'} role
 */
export function assignChartRole(openKey, deliveredKey, columnKey, role) {
  let openMeasureKey = openKey || '';
  let deliveredMeasureKey = deliveredKey || '';
  if (role === 'open') {
    openMeasureKey = columnKey;
    if (deliveredMeasureKey === columnKey) deliveredMeasureKey = '';
  } else if (role === 'delivered') {
    deliveredMeasureKey = columnKey;
    if (openMeasureKey === columnKey) openMeasureKey = '';
  } else {
    if (openMeasureKey === columnKey) openMeasureKey = '';
    if (deliveredMeasureKey === columnKey) deliveredMeasureKey = '';
  }
  return { openMeasureKey, deliveredMeasureKey };
}

/** @returns {''|'open'|'delivered'} */
export function chartRoleForColumn(columnKey, openKey, deliveredKey) {
  if (columnKey && columnKey === openKey) return 'open';
  if (columnKey && columnKey === deliveredKey) return 'delivered';
  return '';
}
