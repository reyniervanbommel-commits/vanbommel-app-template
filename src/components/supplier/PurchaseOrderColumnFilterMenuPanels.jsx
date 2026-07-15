import React from 'react';
import { Text } from '@fluentui/react-components';
import PurchaseOrderColumnGroupingSection from './PurchaseOrderColumnGroupingSection';
import PurchaseOrderAddColumnPane from './PurchaseOrderAddColumnPane';
import PurchaseOrderColumnFormatRulesPane from './PurchaseOrderColumnFormatRulesPane';
import PurchaseOrderColumnTextStylePane from './PurchaseOrderColumnTextStylePane';
import FilterMenuMainPane from './PurchaseOrderColumnFilterMenuMainPane';

export { FilterMenuMainPane };

export function FilterMenuSubPane({
  styles,
  activeSubmenu,
  submenuTop,
  handleAddType,
  remarksAlreadyAdded,
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
  canToggleGroupSummary,
  isGroupSummaryColumn,
  handleToggleGroupSummary,
}) {
  let content = null;

  if (activeSubmenu === 'add') {
    content = (
      <PurchaseOrderAddColumnPane
        styles={styles}
        columnLevel={column?.level}
        remarksAlreadyAdded={remarksAlreadyAdded}
        onConfirm={handleAddType}
      />
    );
  }
  if (activeSubmenu === 'textStyle') {
    content = (
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
    content = (
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
    content = (
      <>
        <Text className={styles.subPaneTitle}>Category / group</Text>
        <PurchaseOrderColumnGroupingSection
          column={column}
          isGroupingColumn={isGroupingColumn}
          groupingColor={groupingColor}
          onSetGroupingColumn={onSetGroupingColumn}
          onClearGrouping={onClearGrouping}
          onSetGroupingColor={onSetGroupingColor}
          canToggleGroupSummary={canToggleGroupSummary}
          isGroupSummaryColumn={isGroupSummaryColumn}
          onToggleGroupSummary={handleToggleGroupSummary}
        />
      </>
    );
  }

  if (!content) return null;

  return (
    <div className={styles.subPane} style={{ top: `${submenuTop || 0}px` }}>
      {content}
    </div>
  );
}
