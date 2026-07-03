import * as XLSX from 'xlsx';

function sanitizeSheetName(name) {
  return String(name || 'Sheet1').replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet1';
}

export function exportSingleRowToExcel({
  sheetName,
  fileName,
  columnNames,
  rowValues,
}) {
  const headers = Array.isArray(columnNames) ? columnNames : [];
  const values = Array.isArray(rowValues) ? rowValues : [];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, values]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));
  XLSX.writeFile(workbook, fileName || 'export.xlsx');
}
