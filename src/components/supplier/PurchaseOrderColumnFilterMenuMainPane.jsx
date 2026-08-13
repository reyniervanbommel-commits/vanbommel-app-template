import React, { useCallback, useMemo } from 'react';
import PurchaseOrderColumnFilterMenuTitleRow from './PurchaseOrderColumnFilterMenuTitleRow';
import PurchaseOrderColumnFilterMenuFilterSection from './PurchaseOrderColumnFilterMenuFilterSection';
import PurchaseOrderColumnFilterMenuSortSection from './PurchaseOrderColumnFilterMenuSortSection';
import PurchaseOrderColumnFilterMenuColumnActionsSection from './PurchaseOrderColumnFilterMenuColumnActionsSection';
import PurchaseOrderColumnColorFilterSection from './PurchaseOrderColumnColorFilterSection';

export default function PurchaseOrderColumnFilterMenuMainPane({
  styles,
  column,
  columnLabel,
  columnTypeMeta,
  columnSourceMeta,
  connectionTargets = [],
  showSortAndFilter = true,
  showGrouping = true,
  showColumnMutations = true,
  activeSubmenu,
  openSubmenu,
  closeSubmenu,
  canSetColumnTextStyle,
  canSetColumnFormatRules,
  canToggleWriteback,
  showWritebackLocked = false,
  handleToggleWriteback,
  writable,
  canAddColumn,
  canRenameColumn,
  handleRenameColumn,
  canEditFormulaColumn,
  handleEditFormulaColumn,
  canConfigureDatePeriodDisplay,
  datePeriodDisplayMode,
  onSelectDatePeriodDisplayMode,
  canRemoveColumn,
  handleRemoveColumn,
  canToggleLineTotal,
  isLineColumnSummed,
  handleToggleLineTotal,
  canPushLineTotalToHeader,
  handlePushLineTotalToHeader,
  canPushLineValuesToHeader,
  handlePushLineValuesToHeader,
  canMakeColumnSticky = false,
  isStickyColumn = false,
  canPromoteToSticky = false,
  canUnstickSticky = false,
  stickyColumnCount = 0,
  handleMakeColumnSticky,
  canHideColumn = false,
  handleHideColumn,
  setSortAsc,
  setSortDesc,
  clearSort,
  isDate,
  isNumber,
  draft,
  operatorLabels,
  operatorEntries,
  handleOperatorSelect,
  handleValueChange,
  handleDraftValueChange,
  uniqueColumnValues,
  handleSecondaryValueChange,
  handleApplyFilter,
  handleClearFilter,
  colorFilter,
}) {
  const handleFilterRowMouseEnter = useCallback(() => {
    closeSubmenu?.();
  }, [closeSubmenu]);

  const showAppearanceSection = useMemo(
    () => Boolean(canSetColumnTextStyle || canSetColumnFormatRules || canConfigureDatePeriodDisplay),
    [canConfigureDatePeriodDisplay, canSetColumnFormatRules, canSetColumnTextStyle]
  );

  const showColumnSection = useMemo(
    () => Boolean(
      canHideColumn
      || canToggleWriteback
      || canAddColumn
      || (showColumnMutations && (canEditFormulaColumn || canRemoveColumn))
      || canToggleLineTotal
      || canPushLineTotalToHeader
      || canPushLineValuesToHeader
      || canMakeColumnSticky
    ),
    [
      canAddColumn,
      canEditFormulaColumn,
      canHideColumn,
      canMakeColumnSticky,
      canPushLineTotalToHeader,
      canPushLineValuesToHeader,
      canRemoveColumn,
      canToggleLineTotal,
      canToggleWriteback,
      showColumnMutations,
    ]
  );

  return (
    <div className={styles.mainPane}>
      <PurchaseOrderColumnFilterMenuTitleRow
        styles={styles}
        columnLabel={columnLabel}
        columnTypeMeta={columnTypeMeta}
        columnSourceMeta={columnSourceMeta}
        connectionTargets={connectionTargets}
        canRenameColumn={canRenameColumn}
        handleRenameColumn={handleRenameColumn}
        showWritebackLocked={showWritebackLocked}
        closeSubmenu={closeSubmenu}
      />
      <div className={styles.divider} />
      {showSortAndFilter ? (
        <>
          <PurchaseOrderColumnFilterMenuSortSection
            styles={styles}
            closeSubmenu={closeSubmenu}
            activeSubmenu={activeSubmenu}
            openSubmenu={openSubmenu}
            showGrouping={showGrouping}
            isDate={isDate}
            isNumber={isNumber}
            setSortAsc={setSortAsc}
            setSortDesc={setSortDesc}
            clearSort={clearSort}
          />
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuFilterSection
            styles={styles}
            columnLabel={columnLabel}
            closeSubmenu={closeSubmenu}
            isDate={isDate}
            isNumber={isNumber}
            draft={draft}
            operatorLabels={operatorLabels}
            operatorEntries={operatorEntries}
            handleOperatorSelect={handleOperatorSelect}
            handleValueChange={handleValueChange}
            handleDraftValueChange={handleDraftValueChange}
            uniqueColumnValues={uniqueColumnValues}
            handleSecondaryValueChange={handleSecondaryValueChange}
            handleApplyFilter={handleApplyFilter}
            handleClearFilter={handleClearFilter}
            onMouseEnter={handleFilterRowMouseEnter}
          />
          {colorFilter?.supported ? (
            <>
              <div className={styles.divider} />
              <PurchaseOrderColumnColorFilterSection
                styles={styles}
                columnLabel={columnLabel}
                availableColors={colorFilter.availableColors}
                selectedColors={colorFilter.selectedColors}
                onToggleColor={colorFilter.toggleColor}
                onClear={colorFilter.clear}
                closeSubmenu={closeSubmenu}
                onMouseEnter={handleFilterRowMouseEnter}
              />
            </>
          ) : null}
        </>
      ) : null}
      {showAppearanceSection || showColumnSection ? <div className={styles.divider} /> : null}
      <PurchaseOrderColumnFilterMenuColumnActionsSection
        styles={styles}
        closeSubmenu={closeSubmenu}
        activeSubmenu={activeSubmenu}
        openSubmenu={openSubmenu}
        showColumnMutations={showColumnMutations}
        canHideColumn={canHideColumn}
        handleHideColumn={handleHideColumn}
        canSetColumnTextStyle={canSetColumnTextStyle}
        canSetColumnFormatRules={canSetColumnFormatRules}
        canToggleWriteback={canToggleWriteback}
        handleToggleWriteback={handleToggleWriteback}
        writable={writable}
        canConfigureDatePeriodDisplay={canConfigureDatePeriodDisplay}
        datePeriodDisplayMode={datePeriodDisplayMode}
        onSelectDatePeriodDisplayMode={onSelectDatePeriodDisplayMode}
        canAddColumn={canAddColumn}
        canEditFormulaColumn={canEditFormulaColumn}
        handleEditFormulaColumn={handleEditFormulaColumn}
        canRemoveColumn={canRemoveColumn}
        handleRemoveColumn={handleRemoveColumn}
        canToggleLineTotal={canToggleLineTotal}
        isLineColumnSummed={isLineColumnSummed}
        handleToggleLineTotal={handleToggleLineTotal}
        canPushLineTotalToHeader={canPushLineTotalToHeader}
        handlePushLineTotalToHeader={handlePushLineTotalToHeader}
        canPushLineValuesToHeader={canPushLineValuesToHeader}
        handlePushLineValuesToHeader={handlePushLineValuesToHeader}
        canMakeColumnSticky={canMakeColumnSticky}
        isStickyColumn={isStickyColumn}
        canPromoteToSticky={canPromoteToSticky}
        canUnstickSticky={canUnstickSticky}
        stickyColumnCount={stickyColumnCount}
        handleMakeColumnSticky={handleMakeColumnSticky}
        showAppearanceSection={showAppearanceSection}
        showColumnSection={showColumnSection}
      />
    </div>
  );
}
