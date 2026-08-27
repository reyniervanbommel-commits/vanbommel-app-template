import React from 'react';
import { makeStyles } from '@fluentui/react-components';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import PurchaseOrderViewTabMenuSection from './viewTabs/PurchaseOrderViewTabMenuSection';

const useStyles = makeStyles({
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
            onSetGroupColor={viewTabs?.setGroupColor}
          />
        )}
      />
    </div>
  );
}
