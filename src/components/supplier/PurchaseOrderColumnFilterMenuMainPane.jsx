import React from 'react';
import { Button, Dropdown, Input, Option, Text } from '@fluentui/react-components';

export default function PurchaseOrderColumnFilterMenuMainPane({
  styles,
  columnLabel,
  showSortAndFilter = true,
  showGrouping = true,
  activeSubmenu,
  toggleSubmenu,
  canSetColumnTextStyle,
  canSetColumnFormatRules,
  canToggleWriteback,
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
}) {
  return (
    <div className={styles.mainPane}>
      <Text className={styles.fieldTitle}>{columnLabel}</Text>
      <div className={styles.divider} />
      {showSortAndFilter ? (
        <>
          <div className={styles.sortActions}>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortAsc}>Sort A to Z</Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortDesc}>Sort Z to A</Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={clearSort}>Clear sort</Button>
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
                <span>Categorie / groeperen</span>
                <span aria-hidden>›</span>
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
            <span>Text style</span>
            <span aria-hidden>›</span>
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
            <span>Conditional formatting</span>
            <span aria-hidden>›</span>
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
            <span>+ Kolom rechts toevoegen</span>
            <span aria-hidden>›</span>
          </Button>
        </>
      ) : null}
      <div className={styles.divider} />
      {canRenameColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleRenameColumn}>Rename column</Button>
          <div className={styles.divider} />
        </>
      ) : null}
      {canEditFormulaColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleEditFormulaColumn}>Formulekolom bewerken</Button>
          <div className={styles.divider} />
        </>
      ) : null}
      {canEditImageColumn ? (
        <>
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleEditImageColumn}>Plaatjekolom bewerken</Button>
          <div className={styles.divider} />
        </>
      ) : null}
      <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleRemoveColumn} disabled={!canRemoveColumn}>
        Delete column
      </Button>
      {canToggleLineTotal ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleLineTotal}>
            {isLineColumnSummed ? 'Disable total row sum' : 'Enable total row sum'}
          </Button>
        </>
      ) : null}
      {canPushLineTotalToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineTotalToHeader}>Push total to header column</Button>
        </>
      ) : null}
      {canPushLineValuesToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineValuesToHeader}>Push values to header column</Button>
        </>
      ) : null}
      {showSortAndFilter ? (
        <>
          <div className={styles.divider} />
          <Text className={styles.fieldTitle}>Filter</Text>
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
