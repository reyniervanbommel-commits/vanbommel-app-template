import React from 'react';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';

/**
 * Rendert de <thead> van het board-overzicht. Bundelt de prop-doorgave-logica naar
 * PurchaseOrdersBoardHeaderRow zodat PurchaseOrdersBoardTable compact blijft.
 */
export default function PurchaseOrdersBoardTableHeader({
  styles,
  selection,
  onSetExpansion,
  columns,
  headerColumnWidths,
  boardView,
  columnActions,
  formatting,
  links,
  lineColumns,
  stickyState,
  collapsedHeaderColumnKeys,
}) {
  const {
    filterByColumn, sortState, setSortDirection, setFilterOperator, setFilterValue,
    setFilterSecondaryValue, applyColumnFilter, clearColumnFilter, setColumnColorFilter,
    groupingColumnKey, groupingColorsByColumn, groupSummaryColumnKeys,
    setGroupingColumn, clearGrouping, setGroupingBarColor, setGroupSummaryColumn,
  } = boardView;
  const {
    onRenameColumn, onRemoveColumn, isAdmin, isStaff = true, onToggleWriteback,
    onReorderHeaderColumn, onSaveHeaderColumnWidth, onSaveHeaderColumnTextStyle,
    onSaveHeaderColumnFormatRules, onAddColumnRightOf, datePeriodDisplayModes = {},
    onSetDatePeriodDisplayMode, editingColumnKey, onEditingDone, reorderingColumns = false,
    trackChangesActiveByColumnId = null, onToggleHeaderColumnCollapsed,
    productImageColumnVisible = true, onToggleProductImageColumn,
  } = columnActions;
  const { headerColumnTextStyles = {}, headerColumnFormatRules = {} } = formatting;
  const { linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey } = links;
  const { stickyColumnKeys, firstNonStickyColumnKey, makeColumnSticky } = stickyState;

  const headerColumnDrag = useColumnReorderDrag({ onReorder: onReorderHeaderColumn, disabled: reorderingColumns });

  return (
    <thead>
      <PurchaseOrdersBoardHeaderRow
        styles={styles}
        selection={selection}
        onSetExpansion={onSetExpansion}
        productImageColumnVisible={productImageColumnVisible}
        onToggleProductImageColumn={onToggleProductImageColumn}
        columns={columns}
        headerColumnDrag={headerColumnDrag}
        headerColumnWidths={headerColumnWidths}
        onSaveHeaderColumnWidth={onSaveHeaderColumnWidth}
        onRenameColumn={onRenameColumn}
        onRemoveColumn={onRemoveColumn}
        isAdmin={isAdmin}
        isStaff={isStaff}
        onToggleWriteback={onToggleWriteback}
        trackChangesActiveByColumnId={trackChangesActiveByColumnId}
        editingColumnKey={editingColumnKey}
        onEditingDone={onEditingDone}
        linkedLineTotalByHeaderKey={linkedLineTotalByHeaderKey}
        linkedLineValueByHeaderKey={linkedLineValueByHeaderKey}
        lineColumns={lineColumns}
        filterByColumn={filterByColumn}
        sortState={sortState}
        groupingColumnKey={groupingColumnKey}
        groupingColorsByColumn={groupingColorsByColumn}
        groupSummaryColumnKeys={groupSummaryColumnKeys}
        setSortDirection={setSortDirection}
        setFilterOperator={setFilterOperator}
        setFilterValue={setFilterValue}
        setFilterSecondaryValue={setFilterSecondaryValue}
        applyColumnFilter={applyColumnFilter}
        clearColumnFilter={clearColumnFilter}
        setColumnColorFilter={setColumnColorFilter}
        setGroupingColumn={setGroupingColumn}
        clearGrouping={clearGrouping}
        setGroupingBarColor={setGroupingBarColor}
        setGroupSummaryColumn={setGroupSummaryColumn}
        onAddColumnRightOf={onAddColumnRightOf}
        datePeriodDisplayModes={datePeriodDisplayModes}
        onSetDatePeriodDisplayMode={onSetDatePeriodDisplayMode}
        headerColumnTextStyles={headerColumnTextStyles}
        onSaveHeaderColumnTextStyle={onSaveHeaderColumnTextStyle}
        headerColumnFormatRules={headerColumnFormatRules}
        onSaveHeaderColumnFormatRules={onSaveHeaderColumnFormatRules}
        referenceColumns={columns}
        stickyColumnKeys={stickyColumnKeys}
        firstNonStickyColumnKey={firstNonStickyColumnKey}
        onMakeColumnSticky={makeColumnSticky}
        collapsedColumnKeys={collapsedHeaderColumnKeys}
        onToggleColumnCollapsed={onToggleHeaderColumnCollapsed}
      />
    </thead>
  );
}
