import React from 'react';
import { Button, Dropdown, Input, Option, Text } from '@fluentui/react-components';
import PurchaseOrderColumnGroupingSection from './PurchaseOrderColumnGroupingSection';

export function FilterMenuMainPane({
  styles,
  columnLabel,
  activeSubmenu,
  toggleSubmenu,
  canSetColumnTextStyle,
  canToggleWriteback,
  handleToggleWriteback,
  writable,
  canAddColumn,
  canRenameColumn,
  handleRenameColumn,
  canEditFormulaColumn,
  handleEditFormulaColumn,
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
      <div className={styles.sortActions}>
        <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortAsc}>Sort A to Z</Button>
        <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortDesc}>Sort Z to A</Button>
        <Button className={styles.sortButton} appearance="subtle" size="small" onClick={clearSort}>Clear sort</Button>
      </div>
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
    </div>
  );
}

export function FilterMenuSubPane({
  styles,
  activeSubmenu,
  newColumnTypes,
  handleAddType,
  textStyleDraft,
  handleTextColorChange,
  handleToggleBold,
  handleToggleItalic,
  handleToggleUnderline,
  columnLabel,
  handleApplyTextStyle,
  handleClearTextStyle,
  column,
  isGroupingColumn,
  groupingColor,
  onSetGroupingColumn,
  onClearGrouping,
  onSetGroupingColor,
}) {
  if (activeSubmenu === 'add') {
    return (
      <div className={styles.subPane}>
        <Text className={styles.subPaneTitle}>Kolomtype</Text>
        {newColumnTypes.map((type) => (
          <Button key={type.key} className={styles.sortButton} appearance="subtle" size="small" onClick={() => handleAddType(type)}>
            {type.label}
          </Button>
        ))}
      </div>
    );
  }

  if (activeSubmenu === 'textStyle') {
    return (
      <div className={styles.subPane}>
        <Text className={styles.subPaneTitle}>Text style</Text>
        <div className={styles.colorRow}>
          <Input
            className={styles.colorInput}
            type="color"
            value={textStyleDraft.textColor || '#000000'}
            onChange={handleTextColorChange}
            aria-label={`Select text color for ${columnLabel}`}
          />
          <Text>{(textStyleDraft.textColor || '#000000').toUpperCase()}</Text>
        </div>
        <div className={styles.formatButtons}>
          <Button
            className={styles.formatButton}
            size="small"
            appearance={textStyleDraft.bold ? 'primary' : 'secondary'}
            onClick={handleToggleBold}
            aria-label="Toggle bold"
          >
            B
          </Button>
          <Button
            className={styles.formatButton}
            size="small"
            appearance={textStyleDraft.italic ? 'primary' : 'secondary'}
            onClick={handleToggleItalic}
            aria-label="Toggle italic"
          >
            I
          </Button>
          <Button
            className={styles.formatButton}
            size="small"
            appearance={textStyleDraft.underline ? 'primary' : 'secondary'}
            onClick={handleToggleUnderline}
            aria-label="Toggle underline"
          >
            U
          </Button>
        </div>
        <Text
          className={styles.stylePreview}
          style={{
            color: textStyleDraft.textColor || undefined,
            fontWeight: textStyleDraft.bold ? 700 : undefined,
            fontStyle: textStyleDraft.italic ? 'italic' : undefined,
            textDecorationLine: textStyleDraft.underline ? 'underline' : undefined,
          }}
        >
          Preview text
        </Text>
        <div className={styles.actionRow}>
          <Button size="small" appearance="primary" onClick={handleApplyTextStyle}>Apply</Button>
          <Button size="small" appearance="secondary" onClick={handleClearTextStyle}>Reset</Button>
        </div>
      </div>
    );
  }

  if (activeSubmenu === 'group') {
    return (
      <div className={styles.subPane}>
        <Text className={styles.subPaneTitle}>Categorie / groeperen</Text>
        <PurchaseOrderColumnGroupingSection
          column={column}
          isGroupingColumn={isGroupingColumn}
          groupingColor={groupingColor}
          onSetGroupingColumn={onSetGroupingColumn}
          onClearGrouping={onClearGrouping}
          onSetGroupingColor={onSetGroupingColor}
        />
      </div>
    );
  }

  return null;
}
