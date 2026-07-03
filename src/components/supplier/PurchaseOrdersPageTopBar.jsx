import React from 'react';
import { Badge, Button, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, CheckmarkRegular } from '@fluentui/react-icons';
import PurchaseOrderBulkActionsBar from './PurchaseOrderBulkActionsBar';
import PurchaseOrderRefreshProgress from './PurchaseOrderRefreshProgress';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import PurchaseOrderHiddenRowsPanel from './PurchaseOrderHiddenRowsPanel';

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
  toolbarSpacer: { flexGrow: 1 },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
});

export default function PurchaseOrdersPageTopBar({
  savedViewsState,
  headerState,
  activityState,
  bulkState,
  hiddenRowsState,
  onOpenAddColumn,
  refreshState,
  error,
}) {
  const styles = useStyles();
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

  return (
    <div className={styles.contentInset}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.tableName}>Purchase Orders</div>
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
        </div>

        <div className={styles.headerRight}>
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

        <PurchaseOrderBulkActionsBar
          selectedCount={selectedCount}
          onDelete={onDeleteSelected}
          onClear={onClearSelection}
        />

        {hiddenRowsState ? (
          <PurchaseOrderHiddenRowsPanel
            hiddenRows={hiddenRowsState.hiddenRows}
            count={hiddenRowsState.count}
            loading={hiddenRowsState.loading}
            restoring={hiddenRowsState.restoring}
            onRestore={hiddenRowsState.restoreRows}
          />
        ) : null}

        <div className={styles.toolbarSpacer} />

        <Button
          appearance="secondary"
          icon={<AddRegular />}
          onClick={onOpenAddColumn}
        >
          Kolom toevoegen
        </Button>
        <PurchaseOrderRefreshProgress
          progress={refreshProgress}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  );
}
