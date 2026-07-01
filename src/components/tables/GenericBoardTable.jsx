import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import EditableCell from '../supplier/EditableCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';

// Generieke, kolom-config-gedreven master/detail-tabel voor de TableViewer (#139).
// Werkt op het generieke /api/data-contract (partitionKey/recordKey/details) en
// leidt alle kolommen af uit meta.columns. Custom kolommen zijn inline bewerkbaar
// (EditableCell), bron-kolommen zijn readonly. Uiterlijk volgt PurchaseOrdersBoardTable.

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '640px' },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '12px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  controlHeaderCell: { width: '44px', textAlign: 'center' },
  itemRow: { ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover } },
  controlCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('4px'),
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  itemCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('8px', '10px'),
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  // Nieuw/gewijzigd sinds laatste bezoek: subtiele linkerrand-markering.
  newRow: { boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteGreenBorderActive}` },
  changedRow: { boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteMarigoldBorderActive}` },
  rowBadge: { marginLeft: '6px' },
  subitemsContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('8px', '8px', '12px', '46px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  subTable: { width: '100%', borderCollapse: 'collapse' },
  subHeaderCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '10px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '10px'),
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  empty: { ...shorthands.padding('16px'), color: tokens.colorNeutralForeground3, textAlign: 'center' },
});

// Rendert één cel: custom kolommen inline bewerkbaar, bron-kolommen readonly.
function renderCell({ column, values, row, detailKey, onSaveValue, isFirst }) {
  const key = column.key;
  const rawValue = values?.[key];

  if (column.source === 'custom' && onSaveValue) {
    return (
      <EditableCell
        dataType={column.dataType}
        value={rawValue}
        options={column.options}
        ariaLabel={`${column.label} bewerken`}
        // Bewust GEEN cellKeys: de CellHistoryPopover in EditableCell praat met het
        // PO-specifieke /purchase-orders/history-endpoint. Het generieke /api/data-
        // contract kent (nog) geen history-endpoint, dus we laten de popover weg;
        // inline bewerken werkt onverkort via onSave.
        onSave={(value) =>
          onSaveValue({
            columnId: column.id ?? key,
            columnKey: key,
            partitionKey: row.partitionKey,
            recordKey: row.recordKey,
            detailKey: detailKey ?? null,
            value,
          })
        }
      />
    );
  }

  const display = formatCellValue(rawValue, column.dataType);
  if (isFirst && (row.isNew || row.isChanged) && detailKey == null) {
    return (
      <span>
        {display}
        <Badge
          color={row.isNew ? 'success' : 'warning'}
          appearance="tint"
          size="small"
          style={{ marginLeft: '6px' }}
        >
          {row.isNew ? 'nieuw' : 'gewijzigd'}
        </Badge>
      </span>
    );
  }
  return display;
}

function GenericBoardTable({ rows, masterColumns, detailColumns, hasDetail, onSaveValue }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState({});

  const rowEntries = useMemo(
    () =>
      rows.map((row, index) => ({
        row,
        rowId: `${row.partitionKey ?? ''}-${row.recordKey ?? ''}-${index}`,
      })),
    [rows],
  );

  // Detail-rijen standaard uitgeklapt (net als het PO-scherm).
  useEffect(() => {
    if (!hasDetail) return;
    setExpanded((prev) => {
      const next = { ...prev };
      rowEntries.forEach(({ rowId, row }) => {
        if (typeof next[rowId] === 'undefined') {
          next[rowId] = Array.isArray(row.details) && row.details.length > 0;
        }
      });
      Object.keys(next).forEach((rowId) => {
        if (!rowEntries.some((e) => e.rowId === rowId)) delete next[rowId];
      });
      return next;
    });
  }, [rowEntries, hasDetail]);

  const toggleRow = useCallback((event) => {
    const rowId = event.currentTarget.dataset.rowid || '';
    if (!rowId) return;
    setExpanded((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  if (!rows.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }

  const colCount = masterColumns.length + 1;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.headerCell} ${styles.controlHeaderCell}`} aria-label="Uitklappen" />
            {masterColumns.map((column) => (
              <th key={column.key} className={styles.headerCell}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowEntries.map(({ row, rowId }) => {
            const details = Array.isArray(row.details) ? row.details : [];
            const showDetail = hasDetail && details.length > 0;
            const isExpanded = !!expanded[rowId];
            const rowClass = row.isNew ? styles.newRow : (row.isChanged ? styles.changedRow : '');
            return (
              <React.Fragment key={rowId}>
                <tr className={`${styles.itemRow} ${rowClass}`}>
                  <td className={styles.controlCell}>
                    {showDetail ? (
                      <Button size="small" appearance="subtle" data-rowid={rowId} onClick={toggleRow}>
                        {isExpanded ? '-' : '+'}
                      </Button>
                    ) : null}
                  </td>
                  {masterColumns.map((column, columnIndex) => (
                    <td key={`${rowId}-${column.key}`} className={styles.itemCell}>
                      {renderCell({
                        column,
                        values: row.values,
                        row,
                        detailKey: null,
                        onSaveValue,
                        isFirst: columnIndex === 0,
                      })}
                    </td>
                  ))}
                </tr>
                {showDetail && isExpanded ? (
                  <tr>
                    <td colSpan={colCount} className={styles.subitemsContainer}>
                      <table className={styles.subTable}>
                        <thead>
                          <tr>
                            {detailColumns.map((column) => (
                              <th key={column.key} className={styles.subHeaderCell}>{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {details.map((detail, di) => (
                            <tr key={`${rowId}-detail-${detail.detailKey ?? di}`}>
                              {detailColumns.map((column) => (
                                <td key={`${rowId}-${detail.detailKey ?? di}-${column.key}`} className={styles.subCell}>
                                  {renderCell({
                                    column,
                                    values: detail.values,
                                    row,
                                    detailKey: detail.detailKey ?? di,
                                    onSaveValue,
                                    isFirst: false,
                                  })}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(GenericBoardTable);
