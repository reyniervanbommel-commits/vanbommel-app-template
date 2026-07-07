import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowClockwiseRegular, CheckmarkRegular } from '@fluentui/react-icons';
import PurchaseOrderBulkActionsBar from './PurchaseOrderBulkActionsBar';
import PurchaseOrderRefreshProgress from './PurchaseOrderRefreshProgress';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import PurchaseOrderHiddenRowsPanel from './PurchaseOrderHiddenRowsPanel';
import PurchaseOrderErrorDialog from './PurchaseOrderErrorDialog';

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
  },
  subtitle: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  freshness: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
  errorWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
});

export default function PurchaseOrdersPageTopBar({
  savedViewsState,
  headerState,
  activityState,
  bulkState,
  hiddenRowsState,
  refreshState,
  error,
}) {
  const styles = useStyles();
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const {
    savedViews,
    activeViewId,
    applyViewState,
    handleResetView,
    handleSaveAsNew,
    handleUpdateActive,
    handleRenameView,
    handleSetDefault,
    handleDeleteView,
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
    markViewed,
    markingViewed,
  } = activityState;
  const {
    selectedCount,
    onDeleteSelected,
    onClearSelection,
  } = bulkState;
  const {
    refreshing,
    refreshProgress,
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
          <div className={styles.tableName}>Purchase Orders</div>
          <div className={styles.viewRow}>
            <PurchaseOrderSavedViewsControl
              titleMode
              views={savedViews.views}
              activeViewId={activeViewId}
              canManageGlobal={isStaff}
              saving={savedViews.saving}
              onApplyView={applyViewState}
              onResetView={handleResetView}
              onSaveAsNew={handleSaveAsNew}
              onUpdateActive={handleUpdateActive}
              onRenameView={handleRenameView}
              onSetDefault={handleSetDefault}
              onDeleteView={handleDeleteView}
            />
            <PurchaseOrderRefreshProgress
              progress={refreshProgress}
              refreshing={refreshing}
              onRefresh={onRefresh}
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
          <div className={styles.freshness}>
            {!hasCache ? (
              <Badge color="warning" appearance="tint">Nog niet gesynchroniseerd</Badge>
            ) : (
              <>
                <span>Laatst ververst: {relativeSynced || 'onbekend'}</span>
                {stale ? (
                  <Badge color="warning" appearance="tint">Verouderd</Badge>
                ) : (
                  <Badge color="success" appearance="tint">Actueel</Badge>
                )}
              </>
            )}
          </div>
          <div className={styles.subtitle}>Totaal: {total}</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        {(newCount > 0 || changedCount > 0) ? (
          <div className={styles.freshness}>
            {newCount > 0 ? <Badge color="success" appearance="filled">{newCount} nieuw</Badge> : null}
            {changedCount > 0 ? <Badge color="warning" appearance="filled">{changedCount} gewijzigd</Badge> : null}
            <Button
              appearance="subtle"
              size="small"
              icon={<CheckmarkRegular />}
              onClick={markViewed}
              disabled={markingViewed}
            >
              {markingViewed ? 'Bezig...' : 'Markeer als gezien'}
            </Button>
          </div>
        ) : null}
        <div className={styles.freshness} title="Highlight-prioriteit: verwijderd > nieuw > gewijzigd">
          <Badge color="danger" appearance="tint" size="small">verwijderd</Badge>
          <Badge color="success" appearance="tint" size="small">nieuw</Badge>
          <Badge color="warning" appearance="tint" size="small">gewijzigd</Badge>
        </div>

        <PurchaseOrderBulkActionsBar
          selectedCount={selectedCount}
          onDelete={onDeleteSelected}
          onClear={onClearSelection}
        />
      </div>

      {error ? (
        <>
          <div className={styles.errorWrap}>
            <div className={styles.error}>{error}</div>
            <Button
              appearance="secondary"
              size="small"
              icon={<ArrowClockwiseRegular />}
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh data'}
            </Button>
            <Button appearance="subtle" size="small" onClick={openErrorDialog}>
              What went wrong?
            </Button>
          </div>
          <PurchaseOrderErrorDialog
            error={error}
            open={errorDialogOpen}
            onOpenChange={closeErrorDialog}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        </>
      ) : null}
    </div>
  );
}
