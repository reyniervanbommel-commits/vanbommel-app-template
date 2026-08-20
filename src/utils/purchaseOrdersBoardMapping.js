// Board-cutover Fase 7 (#AB:176): response-shape-mapping tussen de generieke tb_*-laag
// (/api/data/purchase-orders) en de po_*-vorm die de board-componenten verwachten.
// Pure functies zonder React/side effects zodat ze los unit-testbaar zijn.

const EMPTY_PRODUCT_IMAGE_SUMMARY = { firstItemNumber: '', additionalItemCount: 0 };

const NON_WRITABLE_BOARD_KEYS = {
  header: new Set(['orderNumber', 'status', 'createdDateTime']),
  line: new Set(['lineNumber']),
};

export function resolveBoardWriteBackAllowed(column) {
  if (typeof column.writeBackAllowed === 'boolean') return column.writeBackAllowed;
  if (column.source !== 'd365' || !column.d365Field) return false;
  return !(NON_WRITABLE_BOARD_KEYS[column.level] || new Set()).has(column.key);
}

export function mapTbColumnToBoard(column) {
  if (!column || typeof column !== 'object') return column;
  const source = column.source === 'source' ? 'd365' : column.source;
  const level = column.level === 'line' || column.level === 'header'
    ? column.level
    : (column.scope === 'detail' ? 'line' : 'header');
  const mapped = {
    ...column,
    source,
    level,
    d365Field: column.sourceField ?? column.d365Field ?? null,
    writableToD365: Boolean(column.writable ?? column.writableToD365),
  };
  return {
    ...mapped,
    writeBackAllowed: resolveBoardWriteBackAllowed(mapped),
  };
}

// Eén detailregel (tb_*) → board-regel. Gedeeld door de board-read en het lazy
// nalezen van sublijnen per order (usePurchaseOrderLineDetails).
export function mapTbDetailToBoardLine(d) {
  return {
    lineNumber: d.detailKey,
    values: d.values || {},
    historyByColumnId: d.historyByColumnId || {},
    trackMarksByColumnId: d.trackMarksByColumnId || null,
    isNew: Boolean(d.isNew),
    isChanged: Boolean(d.isChanged),
    isRemoved: Boolean(d.isRemoved),
    changedFieldKeys: Array.isArray(d.changedFieldKeys) ? d.changedFieldKeys : [],
  };
}

// tb_*-read → board-shape: rows→orders, meta.columns.master|detail→columns.header|line,
// partitionKey→dataAreaId, recordKey→orderNumber, detailKey→lineNumber, details→lines,
// detailCount→lineCount, removedAtSource→removedInD365. Overige velden passeren ongewijzigd.
//
// De board-read levert `details` normaal gesproken NIET mee (te grote payload bij ~2000 orders):
// dan blijft `lines` null — "nog niet geladen" — en komen de collapsed-afgeleiden uit de
// rollup (lineCount, hasNewLine/hasChangedLine/hasRemovedLine, productImageSummary).
// De regels zelf worden per order opgehaald zodra de gebruiker de order openklapt.
export function mapTbResponseToBoard(data) {
  if (!data || typeof data !== 'object') return data;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const master = Array.isArray(data?.meta?.columns?.master) ? data.meta.columns.master.map(mapTbColumnToBoard) : [];
  const detail = Array.isArray(data?.meta?.columns?.detail) ? data.meta.columns.detail.map(mapTbColumnToBoard) : [];
  return {
    ...data,
    orders: rows.map((r) => ({
      dataAreaId: r.partitionKey,
      orderNumber: r.recordKey,
      values: r.values || {},
      historyByColumnId: r.historyByColumnId || {},
      trackMarksByColumnId: r.trackMarksByColumnId || null,
      formulaErrors: r.formulaErrors && typeof r.formulaErrors === 'object' ? r.formulaErrors : {},
      isNew: Boolean(r.isNew),
      isChanged: Boolean(r.isChanged),
      changedFieldKeys: Array.isArray(r.changedFieldKeys) ? r.changedFieldKeys : [],
      removedInD365: Boolean(r.removedAtSource) && !Boolean(r.syncRetained),
      hasRemovalChange: Boolean(r.hasRemovalChange),
      syncRetained: Boolean(r.syncRetained),
      lineCount: Number(r.detailCount) || 0,
      hasNewLine: Boolean(r.hasNewLine),
      hasChangedLine: Boolean(r.hasChangedLine),
      hasRemovedLine: Boolean(r.hasRemovedLine),
      productImageSummary: r.productImageSummary || EMPTY_PRODUCT_IMAGE_SUMMARY,
      // Ruwe, ontdubbelde regelwaarden per gekoppelde header-kolom; het board formatteert ze zelf.
      linkedLineValues: r.linkedLineValues && typeof r.linkedLineValues === 'object' ? r.linkedLineValues : null,
      lines: Array.isArray(r.details) ? r.details.map(mapTbDetailToBoardLine) : null,
    })),
    columns: { header: master, line: detail },
  };
}

// tb_*-kolommen leveren scope master|detail; de board-hook denkt in header|line.
export const scopeForLevel = (level) => (level === 'line' ? 'detail' : 'master');
