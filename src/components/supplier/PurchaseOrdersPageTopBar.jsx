import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Divider,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import PurchaseOrderBulkActionsBar from './PurchaseOrderBulkActionsBar';
import PurchaseOrderRefreshProgress from './PurchaseOrderRefreshProgress';
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
  freshness: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statusPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '32px',
    padding: '4px 10px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  freshnessLabel: {
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase200,
  },
  freshnessValue: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase200,
  },
  totalWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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
    relativeSynced,
    stale,
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
    refreshProgress,
    refreshRun,
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
          {isStaff ? (
            <PurchaseOrderRefreshProgress
              progress={refreshProgress}
              run={refreshRun}
              refreshing={refreshing}
              onRefresh={onRefresh}
              canRefresh={isAdmin}
              showProgress={isAdmin}
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
          <div className={styles.statusPanel}>
            <div className={styles.freshness}>
              {hasCache ? (
                <>
                  <Text size={200} className={styles.freshnessLabel}>Last refreshed:</Text>
                  <Text size={200} weight="medium" className={styles.freshnessValue}>
                    {relativeSynced || 'unknown'}
                  </Text>
                </>
              ) : (
                <Text size={200} className={styles.freshnessLabel}>Last refreshed: unknown</Text>
              )}
              {hasCache ? (
                stale ? (
                  <Badge color="warning" appearance="tint">Stale</Badge>
                ) : (
                  <Badge color="success" appearance="tint">Current</Badge>
                )
              ) : (
                <Badge color="warning" appearance="tint">Not synced yet</Badge>
              )}
            </div>
            <Divider vertical />
            <div className={styles.totalWrap}>
              <Text size={200} className={styles.freshnessLabel}>Total</Text>
              <Badge appearance="outline" color="brand">{total}</Badge>
            </div>
          </div>
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
