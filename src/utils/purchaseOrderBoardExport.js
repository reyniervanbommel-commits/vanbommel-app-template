import * as XLSX from 'xlsx';
import { formatCellValue } from './purchaseOrderFormat';
import { isProductImageColumn } from './purchaseOrderProductImageColumn';

// Kolommen zonder zinvolle tekstwaarde slaan we over in de Excel-export
// (thumbnails en remarks-threads laten zich niet als losse cel exporteren).
const NON_EXPORTABLE_DATA_TYPES = new Set(['productImage', 'remarks']);

function sanitizeSheetName(name) {
  return String(name || 'Sheet1').replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet1';
}

/**
 * Bepaalt welke kolommen we exporteren: alleen kolommen met een tekstuele
 * celwaarde (geen product-image thumbnails of remarks-threads).
 */
export function getExportableColumns(columns) {
  return (Array.isArray(columns) ? columns : []).filter(
    (column) => column && !isProductImageColumn(column) && !NON_EXPORTABLE_DATA_TYPES.has(column.dataType)
  );
}

function formatExportCell(rawValue, column) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return '';
  return formatCellValue(rawValue, column.dataType, column);
}

/**
 * Bouwt de array-of-arrays (header + datarijen) voor de Excel-export.
 * Gebruikt dezelfde celformattering als het bord zodat de download aansluit
 * op wat de gebruiker op het scherm ziet.
 */
export function buildBoardExportMatrix(orders, columns) {
  const exportColumns = getExportableColumns(columns);
  const header = exportColumns.map((column) => column.label || column.key);
  const body = (Array.isArray(orders) ? orders : []).map((order) =>
    exportColumns.map((column) => formatExportCell(order?.values?.[column.key], column))
  );
  return [header, body, exportColumns];
}

function buildColumnWidths(matrix) {
  if (!matrix.length) return [];
  const columnCount = matrix[0].length;
  const widths = [];
  for (let col = 0; col < columnCount; col += 1) {
    let max = 0;
    matrix.forEach((row) => {
      const cell = row[col];
      const length = cell == null ? 0 : String(cell).length;
      if (length > max) max = length;
    });
    widths.push({ wch: Math.min(60, Math.max(10, max + 2)) });
  }
  return widths;
}

/**
 * Genereert en downloadt een Excel-bestand van de purchase orders.
 *
 * @param {object} params
 * @param {Array} params.orders - rij-objecten met een `values` map
 * @param {Array} params.columns - kolomdefinities (label + key + dataType)
 * @param {string} [params.fileName] - bestandsnaam (.xlsx)
 * @param {string} [params.sheetName] - werkbladnaam
 * @returns {number} aantal geëxporteerde rijen
 */
export function exportPurchaseOrdersToExcel({ orders, columns, fileName, sheetName }) {
  const [header, body] = buildBoardExportMatrix(orders, columns);
  const matrix = [header, ...body];
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  worksheet['!cols'] = buildColumnWidths(matrix);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName || 'Purchase orders'));
  XLSX.writeFile(workbook, fileName || 'purchase-orders.xlsx');
  return body.length;
}

/**
 * Helpt bij een consistente, datum-gestempelde bestandsnaam.
 */
export function buildExportFileName(scope) {
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = scope === 'view' ? 'current-view' : 'all-orders';
  return `purchase-orders-${suffix}-${stamp}.xlsx`;
}
