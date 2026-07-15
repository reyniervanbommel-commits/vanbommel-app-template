import React, { useCallback } from 'react';
import { Dropdown, Input, Option, Popover, PopoverSurface, PopoverTrigger, Text } from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowResetRegular,
  ArrowRightRegular,
  ArrowBidirectionalLeftRightRegular,
  CalendarLtrRegular,
  DeleteRegular,
  EditRegular,
  FilterRegular,
  LinkRegular,
  LockClosedRegular,
  NumberSymbolRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';
import PurchaseOrderColumnFilterSubmenuButton from './PurchaseOrderColumnFilterSubmenuButton';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';
import { menuLabel, renderColumnTypeIcon } from './purchaseOrderColumnFilterMenuMainPaneUtils';
export default function PurchaseOrderColumnFilterMenuMainPane({
  styles,
  columnLabel,
  columnTypeMeta,
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
  draft,
  operatorLabels,
  operatorEntries,
  handleOperatorSelect,
  handleValueChange,
  handleSecondaryValueChange,
  handleApply,
  handleClearFilter,
  connectionTargets = [],
}) {
  const resolvedTypeMeta = columnTypeMeta || { key: 'text', label: 'Text' };
  const normalizedConnectionTargets = Array.isArray(connectionTargets) ? connectionTargets.filter((target) => String(target || '').trim()) : [];
  const stickyMenuText = canUnstickSticky
    ? 'Unstick column'
    : isStickyColumn
    ? `Already sticky (${stickyColumnCount})`
    : 'Make this the next sticky column';
  const stickyActionDisabled = !canPromoteToSticky && !canUnstickSticky;
  const stickyLabelClassName = `${styles.menuItemContent} ${stickyActionDisabled ? styles.menuItemContentDisabled : ''}`.trim();
  const stickyIconClassName = `${styles.menuItemIcon} ${stickyActionDisabled ? styles.menuItemIconDisabled : ''}`.trim();
  const handleFilterRowMouseEnter = useCallback(() => {
    closeSubmenu?.();
  }, [closeSubmenu]);

  return (
    <div className={styles.mainPane}>
      <div className={styles.titleRow}>
        <span className={styles.titleLabelWrap}>
          {canRenameColumn ? (
            <PurchaseOrderColumnFilterMenuButton
              className={styles.titleLabelButton}
              appearance="transparent"
              size="small"
              closeSubmenu={closeSubmenu}
              onClick={handleRenameColumn}
              aria-label={`Rename column ${columnLabel}`}
            >
              <Text className={styles.fieldTitle}>{columnLabel}</Text>
            </PurchaseOrderColumnFilterMenuButton>
          ) : (
            <Text className={styles.fieldTitle}>{columnLabel}</Text>
          )}
          {showWritebackLocked ? (
            <LockClosedRegular className={styles.titleLockIcon} aria-label="Write-back not available" />
          ) : null}
        </span>
        <span className={styles.typeMeta}>
          <span className={styles.typeIcon} aria-hidden>
            {renderColumnTypeIcon(resolvedTypeMeta.key)}
          </span>
          <span className={styles.typeText} data-testid="column-type-label">{resolvedTypeMeta.label}</span>
          {normalizedConnectionTargets.length ? (
            <Popover positioning="below-end">
              <PopoverTrigger disableButtonEnhancement>
                <PurchaseOrderColumnFilterMenuButton className={styles.typeMetaConnectionButton} appearance="transparent" size="small" closeSubmenu={closeSubmenu} icon={<LinkRegular />} aria-label={`Show connected columns for ${columnLabel}`} />
              </PopoverTrigger>
              <PopoverSurface className={styles.typeMetaConnectionSurface}>
                <Text className={styles.fieldTitle}>Connected columns</Text>
                <ul className={styles.typeMetaConnectionList}>
                  {normalizedConnectionTargets.map((target) => <li key={target}>{target}</li>)}
                </ul>
              </PopoverSurface>
            </Popover>
          ) : null}
        </span>
      </div>
      <div className={styles.divider} />
      {showSortAndFilter ? (
        <>
          <div className={styles.sortActions}>
            <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={setSortAsc}>
              {menuLabel(styles, <ArrowRightRegular />, 'Sort A to Z')}
            </PurchaseOrderColumnFilterMenuButton>
            <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={setSortDesc}>
              {menuLabel(styles, <ArrowClockwiseRegular />, 'Sort Z to A')}
            </PurchaseOrderColumnFilterMenuButton>
            <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={clearSort}>
              {menuLabel(styles, <ArrowResetRegular />, 'Clear sort')}
            </PurchaseOrderColumnFilterMenuButton>
          </div>
          {showGrouping ? (
            <>
              <div className={styles.divider} />
              <PurchaseOrderColumnFilterSubmenuButton styles={styles} name="group" label="Category / group" icon={<TextBulletList20Regular />} activeSubmenu={activeSubmenu} onOpenSubmenu={openSubmenu} />
            </>
          ) : null}
        </>
      ) : null}
      {canHideColumn ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton
            className={styles.sortButton}
            appearance="subtle"
            size="small"
            closeSubmenu={closeSubmenu}
            onClick={handleHideColumn}
          >
            {menuLabel(styles, <ArrowBidirectionalLeftRightRegular />, 'Hide column')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canSetColumnTextStyle ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterSubmenuButton styles={styles} name="textStyle" label="Text style" icon={<EditRegular />} activeSubmenu={activeSubmenu} onOpenSubmenu={openSubmenu} />
        </>
      ) : null}
      {canSetColumnFormatRules ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterSubmenuButton styles={styles} name="formatRules" label="Conditional formatting" icon={<NumberSymbolRegular />} activeSubmenu={activeSubmenu} onOpenSubmenu={openSubmenu} />
        </>
      ) : null}
      {canToggleWriteback ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handleToggleWriteback}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <img src="/d365-sync-cloud.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
              {writable ? 'Disable sync' : 'Enable sync'}
            </span>
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canConfigureDatePeriodDisplay ? (
        <>
          <div className={styles.divider} />
          <Text className={styles.subPaneTitle}>Display as</Text>
          <PurchaseOrderColumnFilterMenuButton
            className={styles.sortButton}
            appearance="subtle"
            size="small"
            closeSubmenu={closeSubmenu}
            aria-pressed={datePeriodDisplayMode !== 'month'}
            onClick={() => onSelectDatePeriodDisplayMode('week')}
          >
            {menuLabel(styles, <CalendarLtrRegular />, 'Week number')}
          </PurchaseOrderColumnFilterMenuButton>
          <PurchaseOrderColumnFilterMenuButton
            className={styles.sortButton}
            appearance="subtle"
            size="small"
            closeSubmenu={closeSubmenu}
            aria-pressed={datePeriodDisplayMode === 'month'}
            onClick={() => onSelectDatePeriodDisplayMode('month')}
          >
            {menuLabel(styles, <CalendarLtrRegular />, 'Month name')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canAddColumn ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterSubmenuButton styles={styles} name="add" label="Add column to the right" icon={<AddRegular />} activeSubmenu={activeSubmenu} onOpenSubmenu={openSubmenu} />
        </>
      ) : null}
      <div className={styles.divider} />
      {showColumnMutations && canEditFormulaColumn ? (
        <>
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handleEditFormulaColumn}>
            {menuLabel(styles, <NumberSymbolRegular />, 'Edit formula column')}
          </PurchaseOrderColumnFilterMenuButton>
          <div className={styles.divider} />
        </>
      ) : null}
      {showColumnMutations && canRemoveColumn ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handleRemoveColumn}>
            {menuLabel(styles, <DeleteRegular />, 'Delete column')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canToggleLineTotal ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handleToggleLineTotal}>
            {menuLabel(styles, <NumberSymbolRegular />, isLineColumnSummed ? 'Disable total row sum' : 'Enable total row sum')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canPushLineTotalToHeader ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handlePushLineTotalToHeader}>
            {menuLabel(styles, <LinkRegular />, 'Push total to header column')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canPushLineValuesToHeader ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={handlePushLineValuesToHeader}>
            {menuLabel(styles, <LinkRegular />, 'Push values to header column')}
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {canMakeColumnSticky ? (
        <>
          <div className={styles.divider} />
          <PurchaseOrderColumnFilterMenuButton
            className={styles.sortButton}
            appearance="subtle"
            size="small"
            closeSubmenu={closeSubmenu}
            onClick={handleMakeColumnSticky}
            disabled={stickyActionDisabled}
          >
            <span className={stickyLabelClassName}>
              <span className={stickyIconClassName} aria-hidden>
                <ArrowRightRegular />
              </span>
              <span>{stickyMenuText}</span>
            </span>
          </PurchaseOrderColumnFilterMenuButton>
        </>
      ) : null}
      {showSortAndFilter ? (
        <>
          <div className={styles.divider} />
          <Text className={styles.fieldTitle}>{menuLabel(styles, <FilterRegular />, 'Filter')}</Text>
          <div className={styles.filterRow} onMouseEnter={handleFilterRowMouseEnter}>
            <Dropdown selectedOptions={[draft.operator]} value={operatorLabels[draft.operator]} onOptionSelect={handleOperatorSelect}>
              {operatorEntries.map(([key, label]) => (
                <Option key={key} value={key} text={label}>{label}</Option>
              ))}
            </Dropdown>
            {isDate && draft.operator === 'between' ? (
              <>
                <Input type="date" value={draft.value} onChange={handleValueChange} />
                <Input type="date" value={draft.secondaryValue} onChange={handleSecondaryValueChange} />
              </>
            ) : null}
            {isDate && (draft.operator === 'before' || draft.operator === 'after') ? (
              <Input type="date" value={draft.value} onChange={handleValueChange} />
            ) : null}
            {isDate && (draft.operator === 'inNextWeeks' || draft.operator === 'inNextDays') ? (
              <Input type="number" min={1} value={draft.value} onChange={handleValueChange} placeholder="Amount" />
            ) : null}
            {isDate && draft.operator === 'nextWeek' ? (
              <Text className={styles.hint}>Matches records in the next calendar week.</Text>
            ) : null}
            {!isDate ? (
              <Input value={draft.value} onChange={handleValueChange} placeholder={draft.operator === 'oneOf' ? 'Value1, Value2, Value3' : 'Value'} />
            ) : null}
            <div className={styles.actionRow}>
              <PurchaseOrderColumnFilterMenuButton size="small" appearance="primary" closeSubmenu={closeSubmenu} onClick={handleApply}>Apply</PurchaseOrderColumnFilterMenuButton>
              <PurchaseOrderColumnFilterMenuButton size="small" appearance="secondary" closeSubmenu={closeSubmenu} onClick={handleClearFilter}>Clear</PurchaseOrderColumnFilterMenuButton>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
