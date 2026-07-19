import React, { memo, useCallback, useState } from 'react';
import { Checkbox, Text, mergeClasses } from '@fluentui/react-components';
import { CAPACITY_PLANNING_COLUMNS } from './rccpCapacityPlanningColumns';
import RccpCapacityColumnMenu from './RccpCapacityColumnMenu';
import { useRccpCapacityPlanningTableStyles, RCCP_CAPACITY_CONTROL_WIDTH } from './rccpCapacityPlanningTableStyles';
import { useRccpCapacityColumnWidths } from '../../hooks/useRccpCapacityColumnWidths';

function SpreadsheetRow({
  row,
  readOnly,
  selected,
  onToggleSelect,
  onUpdate,
  onSave,
}) {
  const styles = useRccpCapacityPlanningTableStyles();
  const [busy, setBusy] = useState(false);

  const handleFieldChange = useCallback((field) => (event) => {
    onUpdate(row.localKey, field, event.target.value);
  }, [onUpdate, row.localKey]);

  const handleBlur = useCallback(async () => {
    if (readOnly || busy || !row.dirty) return;
    setBusy(true);
    await onSave(row);
    setBusy(false);
  }, [busy, onSave, readOnly, row]);

  const handleSelectClick = useCallback((event) => {
    event.preventDefault();
    onToggleSelect(row.localKey, event);
  }, [onToggleSelect, row.localKey]);

  const rowClass = mergeClasses(
    styles.itemRow,
    row.dirty && styles.rowDirty,
    row.isNew && styles.rowNew,
    selected && styles.rowSelected,
    busy && styles.rowBusy,
  );

  return (
    <tr className={rowClass}>
      <td className={styles.controlCell}>
        <div className={styles.controlCellInner}>
          {!readOnly && (
            <Checkbox
              className={styles.rowCheckbox}
              checked={selected}
              onClick={handleSelectClick}
              aria-label={`Select row ${row.localKey}`}
            />
          )}
        </div>
      </td>
      {CAPACITY_PLANNING_COLUMNS.map((column) => (
        <td key={column.key} className={styles.dataCell}>
          <input
            className={mergeClasses(
              styles.cellInput,
              column.align === 'right' && styles.alignRight,
            )}
            type={column.type || 'text'}
            value={row[column.key] ?? ''}
            disabled={readOnly || busy}
            onChange={handleFieldChange(column.key)}
            onBlur={handleBlur}
            aria-label={column.label}
            min={column.key === 'isoWeek' ? 1 : undefined}
            max={column.key === 'isoWeek' ? 53 : undefined}
          />
        </td>
      ))}
    </tr>
  );
}

const MemoSpreadsheetRow = memo(SpreadsheetRow);

function RccpCapacityPlanningTable({
  rows,
  totalCount = 0,
  readOnly,
  rowError,
  filters,
  sort,
  isColumnFilterActive,
  onFilterChange,
  onClearColumnFilter,
  onSetSortAsc,
  onSetSortDesc,
  onClearSort,
  selectedKeys,
  allVisibleSelected,
  someVisibleSelected,
  onToggleSelectAll,
  onToggleRowSelection,
  onUpdate,
  onSave,
}) {
  const styles = useRccpCapacityPlanningTableStyles();
  const columnWidths = useRccpCapacityColumnWidths(rows);

  return (
    <div className={styles.root}>
      <div className={styles.wrapper}>
        <table className={styles.table} aria-label="Capacity planning">
          <colgroup>
            <col style={{ width: RCCP_CAPACITY_CONTROL_WIDTH }} />
            {CAPACITY_PLANNING_COLUMNS.map((column) => (
              <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={styles.controlHeaderCell} aria-label="Row selection">
                {!readOnly && (
                  <Checkbox
                    className={styles.selectAll}
                    checked={allVisibleSelected ? true : (someVisibleSelected ? 'mixed' : false)}
                    onChange={(_, data) => onToggleSelectAll(Boolean(data.checked))}
                    aria-label="Select all visible rows"
                  />
                )}
              </th>
              {CAPACITY_PLANNING_COLUMNS.map((column) => {
                const filterActive = isColumnFilterActive(column.key);
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={mergeClasses(
                      styles.headerCell,
                      filterActive && styles.headerCellFiltered,
                    )}
                  >
                    <div className={styles.headerCellContent}>
                      <div className={styles.headerCellLabel}>
                        <span className={styles.headerLabelText}>{column.label}</span>
                      </div>
                      {!readOnly && (
                        <RccpCapacityColumnMenu
                          columnKey={column.key}
                          columnLabel={column.label}
                          filterValue={filters[column.key]}
                          sortKey={sort.key}
                          sortDirection={sort.key === column.key ? sort.direction : 'none'}
                          onSetFilter={onFilterChange}
                          onClearFilter={onClearColumnFilter}
                          onSetSortAsc={onSetSortAsc}
                          onSetSortDesc={onSetSortDesc}
                          onClearSort={onClearSort}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MemoSpreadsheetRow
                key={row.localKey}
                row={row}
                readOnly={readOnly}
                selected={selectedKeys.has(row.localKey)}
                onToggleSelect={onToggleRowSelection}
                onUpdate={onUpdate}
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Text className={styles.empty}>
          {totalCount > 0
            ? 'No rows match the current filters.'
            : 'No capacity records yet. Import Excel or add a row.'}
        </Text>
      )}
      {rowError && <Text className={styles.error}>{rowError}</Text>}
    </div>
  );
}

export default memo(RccpCapacityPlanningTable);
