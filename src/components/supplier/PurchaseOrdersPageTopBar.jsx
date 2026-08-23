import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import PurchaseOrderBulkActionsBar from './PurchaseOrderBulkActionsBar';
import PurchaseOrderSyncStatus from './PurchaseOrderSyncStatus';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import PurchaseOrderHiddenRowsPanel from './PurchaseOrderHiddenRowsPanel';
import PurchaseOrderErrorDialog from './PurchaseOrderErrorDialog';
import PurchaseOrderChangeActivityBar from './PurchaseOrderChangeActivityBar';
import { useAuth } from '../../context/AuthContext';

const useStyles = makeStyles({
  contentInset: {
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleWrap: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  viewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tableName: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: '1',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  errorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
});

export default function PurchaseOrdersPageTopBar({
  savedViewsState,
  headerState,
  activityState,
  bulkState,
  hiddenRowsState,
  refreshState,
  onExportExcel,
  error,
}) {
  const styles = useStyles();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const {
    savedViews,
    activeViewId,
    hasUnsavedChanges,
    applyViewState,
    handleResetView,
    handleSaveAsNew,
    handleUpdateActive,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
    handleToggleShowHistory,
  } = savedViewsState;
  const {
    isStaff,
    hasCache,
    lastRefreshedLabel,
    visibleCount,
    total,
  } = headerState;
  const {
    newCount,
    changedCount,
    removedCount,
    markViewed,
    markingViewed,
    activityFilter,
    toggleActivityFilter,
  } = activityState;
  const {
    selectedCount,
    onDeleteSelected,
    onClearSelection,
  } = bulkState;
  const {
    refreshing,
    onRefresh,
  } = refreshState;
  const hasError = Boolean(error);

  useEffect(() => {
    if (hasError) setErrorDialogOpen(true);
  }, [hasError]);

  const openErrorDialog = useCallback(() => {
    setErrorDialogOpen(true);
  }, []);

  const closeErrorDialog = useCallback((open) => {
    setErrorDialogOpen(Boolean(open));
  }, []);

  return (
    <div className={styles.contentInset}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.tableName}>Master plan purchase orders</div>
          <div className={styles.viewRow}>
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
              onSaveAsNew={handleSaveAsNew}
              onUpdateActive={handleUpdateActive}
              onRenameView={handleRenameView}
              onSetDefault={handleSetDefault}
              onDeleteView={handleDeleteView}
              onToggleShowHistory={handleToggleShowHistory}
              onExportExcel={onExportExcel}
            />
          </div>
        </div>

        <div className={styles.headerRight}>
          {hiddenRowsState ? (
            <PurchaseOrderHiddenRowsPanel
              hiddenRows={hiddenRowsState.hiddenRows}
              columns={hiddenRowsState.columns}
              count={hiddenRowsState.count}
              loading={hiddenRowsState.loading}
              restoring={hiddenRowsState.restoring}
              onRestore={hiddenRowsState.restoreRows}
            />
          ) : null}
          {error ? (
            <div className={styles.errorIndicator}>
              <Badge color="danger" appearance="filled">Request failed</Badge>
              <Button appearance="subtle" size="small" onClick={openErrorDialog}>
                What went wrong?
              </Button>
            </div>
          ) : null}
          <PurchaseOrderSyncStatus
            hasCache={hasCache}
            lastRefreshedLabel={lastRefreshedLabel}
            visibleCount={visibleCount}
            total={total}
            refreshing={refreshing}
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <PurchaseOrderChangeActivityBar
          newCount={newCount}
          changedCount={changedCount}
          removedCount={removedCount}
          markViewed={markViewed}
          markingViewed={markingViewed}
          canMarkViewed
          activityFilter={activityFilter}
          toggleActivityFilter={toggleActivityFilter}
        />

        <PurchaseOrderBulkActionsBar
          selectedCount={selectedCount}
          onDelete={onDeleteSelected}
          onClear={onClearSelection}
        />
      </div>

      {error ? (
        <PurchaseOrderErrorDialog
          error={error}
          open={errorDialogOpen}
          onOpenChange={closeErrorDialog}
          onRefresh={onRefresh}
          refreshing={refreshing}
          canRefresh={isAdmin}
        />
      ) : null}
    </div>
  );
}
