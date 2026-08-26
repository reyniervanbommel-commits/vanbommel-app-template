import React from 'react';
import { makeStyles } from '@fluentui/react-components';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import PurchaseOrderViewTabsHost from './PurchaseOrderViewTabsHost';
import PurchaseOrderViewTabMenuSection from './viewTabs/PurchaseOrderViewTabMenuSection';

const useStyles = makeStyles({
  viewRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'nowrap',
    minWidth: 0,
    width: '100%',
  },
  viewTitle: {
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '260px',
  },
});

export default function PurchaseOrderViewTitleRow({
  savedViewsState,
  isStaff,
  columns,
  onExportExcel,
  promptCreateTabs,
  onPromptCreateTabsHandled,
  onSaveAsNew,
  onRequestUpdate,
}) {
  const styles = useStyles();
  const {
    savedViews,
    activeViewId,
    hasUnsavedChanges,
    applyViewState,
    handleResetView,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
    handleToggleShowHistory,
    allOrdersShowHistoryIndicators,
    viewTabs,
  } = savedViewsState;

  return (
    <div className={styles.viewRow}>
      <div className={styles.viewTitle}>
        <PurchaseOrderSavedViewsControl
          titleMode
          views={savedViews.views}
          activeViewId={activeViewId}
          canManageGlobal={isStaff}
          canManageViews={isStaff}
          saving={savedViews.saving}
          hasUnsavedChanges={hasUnsavedChanges}
          onApplyView={applyViewState}
          onResetView={handleResetView}
          onSaveAsNew={onSaveAsNew}
          onUpdateActive={onRequestUpdate}
          onRenameView={handleRenameView}
          onSetDefault={handleSetDefault}
          onDeleteView={handleDeleteView}
          onToggleShowHistory={handleToggleShowHistory}
          allOrdersShowHistoryIndicators={allOrdersShowHistoryIndicators}
          onExportExcel={onExportExcel}
          tabMenu={(
            <PurchaseOrderViewTabMenuSection
              enabled={Boolean(activeViewId && isStaff && viewTabs)}
              groups={viewTabs?.groups || []}
              columns={columns}
              uniqueValueCount={viewTabs?.uniqueValueCount}
              promptCreateTabs={promptCreateTabs}
              onPromptCreateTabsHandled={onPromptCreateTabsHandled}
              onAddBlankTab={viewTabs?.addBlankTab}
              onAddFromColumn={viewTabs?.addTabsFromColumn}
              onSetGroupColor={viewTabs?.setGroupColor}
            />
          )}
        />
      </div>
      {viewTabs ? (
        <PurchaseOrderViewTabsHost
          activeViewId={activeViewId}
          viewTabs={viewTabs}
          columns={columns}
          canManage={isStaff}
        />
      ) : null}
    </div>
  );
}
