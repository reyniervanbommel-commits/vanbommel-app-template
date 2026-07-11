import React from 'react';
import { Text } from '@fluentui/react-components';
import PurchaseOrderColumnGroupingSection from './PurchaseOrderColumnGroupingSection';
import PurchaseOrderAddColumnPane from './PurchaseOrderAddColumnPane';
import PurchaseOrderColumnFormatRulesPane from './PurchaseOrderColumnFormatRulesPane';
import PurchaseOrderColumnTextStylePane from './PurchaseOrderColumnTextStylePane';

export { default as FilterMenuMainPane } from './PurchaseOrderColumnFilterMenuMainPane';

export function FilterMenuSubPane({
  styles,
  activeSubmenu,
  handleAddType,
  textStyleDraft,
  handleTextColorChange,
  handleToggleBold,
  handleToggleItalic,
  handleToggleUnderline,
  columnLabel,
  handleApplyTextStyle,
  handleClearTextStyle,
  formatTarget,
  setFormatTarget,
  formatRules,
  formatReferenceColumns,
  addFormatRule,
  updateFormatRule,
  removeFormatRule,
  handleApplyFormatRules,
  handleClearFormatRules,
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
        <PurchaseOrderAddColumnPane columnLevel={column?.level} onConfirm={handleAddType} />
      </div>
    );
  }
  if (activeSubmenu === 'textStyle') {
    return (
      <PurchaseOrderColumnTextStylePane
        styles={styles}
        textStyleDraft={textStyleDraft}
        handleTextColorChange={handleTextColorChange}
        handleToggleBold={handleToggleBold}
        handleToggleItalic={handleToggleItalic}
        handleToggleUnderline={handleToggleUnderline}
        columnLabel={columnLabel}
        handleApplyTextStyle={handleApplyTextStyle}
        handleClearTextStyle={handleClearTextStyle}
      />
    );
  }

  if (activeSubmenu === 'formatRules') {
    return (
      <PurchaseOrderColumnFormatRulesPane
        styles={styles}
        formatTarget={formatTarget}
        setFormatTarget={setFormatTarget}
        formatRules={formatRules}
        formatReferenceColumns={formatReferenceColumns}
        addFormatRule={addFormatRule}
        updateFormatRule={updateFormatRule}
        removeFormatRule={removeFormatRule}
        handleApplyFormatRules={handleApplyFormatRules}
        handleClearFormatRules={handleClearFormatRules}
      />
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
