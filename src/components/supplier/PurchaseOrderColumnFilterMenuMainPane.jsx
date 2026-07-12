import React from 'react';
import { Button, Dropdown, Input, Option, Popover, PopoverSurface, PopoverTrigger, Text } from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowResetRegular,
  ArrowRightRegular,
  CheckmarkRegular,
  DeleteRegular,
  EditRegular,
  FilterRegular,
  LinkRegular,
  LockClosedRegular,
  NumberSymbolRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';

function menuLabel(styles, icon, text) {
  return (
    <span className={styles.menuItemContent}>
      <span className={styles.menuItemIcon} aria-hidden>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function submenuLabel(styles, icon, text) {
  return (
    <span className={styles.submenuItemContent}>
      <span className={styles.submenuItemLabel}>
        <span className={styles.menuItemIcon} aria-hidden>{icon}</span>
        <span>{text}</span>
      </span>
      <span aria-hidden>›</span>
    </span>
  );
}

function renderColumnTypeIcon(typeKey) {
  switch (typeKey) {
    case 'number':
      return <NumberSymbolRegular />;
    case 'date':
      return <ArrowClockwiseRegular />;
    case 'boolean':
      return <CheckmarkRegular />;
    case 'select':
      return <TextBulletList20Regular />;
    case 'image':
      return <LinkRegular />;
    case 'connected':
      return <LinkRegular />;
    case 'formula':
      return <span>fx</span>;
    case 'text':
    default:
      return <EditRegular />;
  }
}

export default function PurchaseOrderColumnFilterMenuMainPane({
  styles,
  columnLabel,
  columnTypeMeta,
  showSortAndFilter = true,
  showGrouping = true,
  activeSubmenu,
  toggleSubmenu,
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
  canEditImageColumn,
  handleEditImageColumn,
  canRemoveColumn,
  handleRemoveColumn,
  canToggleLineTotal,
  isLineColumnSummed,
  handleToggleLineTotal,
  canPushLineTotalToHeader,
  handlePushLineTotalToHeader,
  canPushLineValuesToHeader,
  handlePushLineValuesToHeader,
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

  return (
    <div className={styles.mainPane}>
      <div className={styles.titleRow}>
        <span className={styles.titleLabelWrap}>
          <Text className={styles.fieldTitle}>{columnLabel}</Text>
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
                <Button className={styles.typeMetaConnectionButton} appearance="transparent" size="small" icon={<LinkRegular />} aria-label={`Show connected columns for ${columnLabel}`} />
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
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortAsc}>
              {menuLabel(styles, <ArrowRightRegular />, 'Sort A to Z')}
            </Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortDesc}>
              {menuLabel(styles, <ArrowClockwiseRegular />, 'Sort Z to A')}
            </Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={clearSort}>
              {menuLabel(styles, <ArrowResetRegular />, 'Clear sort')}
            </Button>
          </div>
          {showGrouping ? (
            <>
              <div className={styles.divider} />
              <Button
                className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'group' ? styles.submenuButtonActive : ''}`}
                appearance="subtle"
                size="small"
                onClick={() => toggleSubmenu('group')}
              >
                {submenuLabel(styles, <TextBulletList20Regular />, 'Categorie / groeperen')}
              </Button>
            </>
          ) : null}
        </>
      ) : null}
      {canSetColumnTextStyle ? (
        <>
          <div className={styles.divider} />
          <Button
            className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'textStyle' ? styles.submenuButtonActive : ''}`}
            appearance="subtle"
            size="small"
            onClick={() => toggleSubmenu('textStyle')}
          >
            {submenuLabel(styles, <EditRegular />, 'Text style')}
          </Button>
        </>
      ) : null}
      {canSetColumnFormatRules ? (
        <>
          <div className={styles.divider} />
          <Button
            className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'formatRules' ? styles.submenuButtonActive : ''}`}
            appearance="subtle"
            size="small"
            onClick={() => toggleSubmenu('formatRules')}
          >
            {submenuLabel(styles, <NumberSymbolRegular />, 'Conditional formatting')}
          </Button>
        </>
      ) : null}
      {canToggleWriteback ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleWriteback}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <img src="/d365-sync-cloud.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
              {writable ? 'Sync uitzetten' : 'Sync aanzetten'}
            </span>
          </Button>
        </>
      ) : null}
      {canAddColumn ? (
        <>
          <div className={styles.divider} />
          <Button
            className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'add' ? styles.submenuButtonActive : ''}`}
            appearance="subtle"
            size="small"
            onClick={() => toggleSubmenu('add')}
          >
            {submenuLabel(styles, <AddRegular />, 'Kolom rechts toevoegen')}
          </Button>
        </>
      ) : null}
      <div className={styles.divider} />
      {canRenameColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleRenameColumn}>
            {menuLabel(styles, <EditRegular />, 'Rename column')}
          </Button>
          <div className={styles.divider} />
        </>
      ) : null}
      {canEditFormulaColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleEditFormulaColumn}>
            {menuLabel(styles, <NumberSymbolRegular />, 'Formulekolom bewerken')}
          </Button>
          <div className={styles.divider} />
        </>
      ) : null}
      {canEditImageColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleEditImageColumn}>
            {menuLabel(styles, <LinkRegular />, 'Plaatjekolom bewerken')}
          </Button>
          <div className={styles.divider} />
        </>
      ) : null}
      <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleRemoveColumn} disabled={!canRemoveColumn}>
        {menuLabel(styles, <DeleteRegular />, 'Delete column')}
      </Button>
      {canToggleLineTotal ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleLineTotal}>
            {menuLabel(styles, <NumberSymbolRegular />, isLineColumnSummed ? 'Disable total row sum' : 'Enable total row sum')}
          </Button>
        </>
      ) : null}
      {canPushLineTotalToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineTotalToHeader}>
            {menuLabel(styles, <LinkRegular />, 'Push total to header column')}
          </Button>
        </>
      ) : null}
      {canPushLineValuesToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineValuesToHeader}>
            {menuLabel(styles, <LinkRegular />, 'Push values to header column')}
          </Button>
        </>
      ) : null}
      {showSortAndFilter ? (
        <>
          <div className={styles.divider} />
          <Text className={styles.fieldTitle}>{menuLabel(styles, <FilterRegular />, 'Filter')}</Text>
          <div className={styles.filterRow}>
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
              <Button size="small" appearance="primary" onClick={handleApply}>Apply</Button>
              <Button size="small" appearance="secondary" onClick={handleClearFilter}>Clear</Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
