import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, AddRegular, CheckmarkRegular } from '@fluentui/react-icons';
import EmptyState from '../shared/EmptyState';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import PurchaseOrderAddColumnDialog from './PurchaseOrderAddColumnDialog';
import PurchaseOrderRefreshProgress from './PurchaseOrderRefreshProgress';
import PurchaseOrderSavedViewsControl from './PurchaseOrderSavedViewsControl';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrderSavedViews } from '../../hooks/usePurchaseOrderSavedViews';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { useAuth } from '../../context/AuthContext';
import { formatSyncedAt } from '../../utils/purchaseOrderFormat';

const BOARD_KEY = 'purchase-orders';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    paddingTop: '24px',
    paddingBottom: '24px',
  },
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
  titleWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  title: { fontSize: '24px', fontWeight: 600 },
  subtitle: { color: tokens.colorNeutralForeground3 },
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
  tableRegion: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',
    '& > *': {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflow: 'auto',
      scrollbarGutter: 'stable',
    },
  },
});

export default function PurchaseOrdersPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const {
    progress: refreshProgress,
    startProgress,
    finishProgress,
  } = usePurchaseOrderRefreshProgress();

  const {
    orders,
    visibleHeaderColumns,
    lineColumns,
    syncedAt,
    stale,
    hasCache,
    total,
    loading,
    refreshing,
    error,
    refresh,
    saveValue,
    addColumn,
    renameColumn,
    removeColumn,
    newCount,
    changedCount,
    markViewed,
    markingViewed,
    correctField,
    toggleWriteback,
    reorderHeaderColumn,
    reorderLineColumn,
    headerColumnWidths,
    lineColumnWidths,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    savingColumns,
    exportColumnLayout,
    applyColumnLayout,
  } = usePurchaseOrdersPage();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  // Filter/sort/grouping-state op page-niveau, zodat saved views deze samen met de
  // kolomlayout kunnen serialiseren en terugzetten.
  const boardView = usePurchaseOrderBoardView({ items: orders, columns: visibleHeaderColumns });
  const savedViews = usePurchaseOrderSavedViews({ boardKey: BOARD_KEY });
  const [activeViewId, setActiveViewId] = useState(null);
  const autoAppliedRef = useRef(false);

  // Bouw de volledige view-state: kolomlayout (uit board-settings) + filter/sort/grouping.
  const buildCurrentViewState = useCallback(() => ({
    columns: exportColumnLayout(),
    table: boardView.exportFilterSortGrouping(),
  }), [exportColumnLayout, boardView]);

  // Pas een opgeslagen view volledig toe en markeer hem als actief.
  const applyViewState = useCallback((view) => {
    const state = view?.viewState || {};
    applyColumnLayout(state.columns);
    boardView.applyFilterSortGrouping(state.table);
    setActiveViewId(view?.id ?? null);
  }, [applyColumnLayout, boardView]);

  const handleResetView = useCallback(() => {
    boardView.clearAllFilters();
    boardView.clearSort();
    boardView.clearGrouping();
    setActiveViewId(null);
  }, [boardView]);

  const handleSaveAsNew = useCallback(async ({ name, scope, isDefault }) => {
    const created = await savedViews.createView({
      name,
      scope,
      viewState: buildCurrentViewState(),
      isDefault,
    });
    if (created?.id) setActiveViewId(created.id);
  }, [savedViews, buildCurrentViewState]);

  const handleUpdateActive = useCallback(async (view) => {
    await savedViews.updateView(view.id, { viewState: buildCurrentViewState() });
  }, [savedViews, buildCurrentViewState]);

  const handleRenameView = useCallback(async (view, name) => {
    await savedViews.updateView(view.id, { name });
  }, [savedViews]);

  const handleSetDefault = useCallback(async (view) => {
    await savedViews.updateView(view.id, { isDefault: true });
  }, [savedViews]);

  const handleDeleteView = useCallback(async (view) => {
    await savedViews.deleteView(view.id);
    if (view.id === activeViewId) setActiveViewId(null);
  }, [savedViews, activeViewId]);

  // Pas eenmalig de default-view toe zodra views + orders geladen zijn (persoonlijk > globaal).
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (savedViews.loading || loading || !orders.length) return;
    autoAppliedRef.current = true;
    const personalDefault = savedViews.views.find((view) => view.scope === 'personal' && view.isDefault);
    const globalDefault = savedViews.views.find((view) => view.scope === 'global' && view.isDefault);
    const defaultView = personalDefault || globalDefault;
    if (defaultView) {
      applyViewState(defaultView);
    }
  }, [savedViews.loading, savedViews.views, loading, orders.length, applyViewState]);

  const handleOpenAddColumn = useCallback(() => setAddColumnOpen(true), []);
  const handleRefresh = useCallback(async () => {
    startProgress();
    try {
      await refresh();
    } finally {
      await finishProgress();
    }
  }, [finishProgress, refresh, startProgress]);

  const relativeSynced = formatSyncedAt(syncedAt);

  return (
    <div className={styles.page}>
      <div className={styles.contentInset}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.title}>Purchase Orders</div>
            <div className={styles.subtitle}>
              Total: {total}
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
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

          <div className={styles.toolbarSpacer} />

          <PurchaseOrderSavedViewsControl
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

          <Button
            appearance="secondary"
            icon={<AddRegular />}
            onClick={handleOpenAddColumn}
          >
            Kolom toevoegen
          </Button>
          <Button
            appearance="primary"
            icon={refreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Vernieuwen...' : 'Vernieuwen'}
          </Button>
        </div>

        {refreshing ? <PurchaseOrderRefreshProgress progress={refreshProgress} /> : null}

        {error ? <div className={styles.error}>{error}</div> : null}
      </div>

      {loading ? (
        <div className={styles.contentInset}>
          <Spinner label="Loading purchase orders from SQL cache..." />
        </div>
      ) : refreshing && orders.length === 0 ? (
        <div className={styles.contentInset}>
          <Spinner label="Loading purchase orders from D365..." />
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.contentInset}>
          <EmptyState
            title="Geen purchase orders gevonden"
            description="Vernieuw de gegevens of controleer de D365-synchronisatie."
          />
        </div>
      ) : (
        <div className={styles.tableRegion}>
          <PurchaseOrdersBoardTable
            columns={visibleHeaderColumns}
            lineColumns={lineColumns}
            items={orders}
            boardView={boardView}
            onSaveValue={saveValue}
            onRenameColumn={renameColumn}
            onRemoveColumn={removeColumn}
            onCorrect={correctField}
            isAdmin={isAdmin}
            onToggleWriteback={toggleWriteback}
            onReorderHeaderColumn={reorderHeaderColumn}
            onReorderLineColumn={reorderLineColumn}
            headerColumnWidths={headerColumnWidths}
            lineColumnWidths={lineColumnWidths}
            onSaveHeaderColumnWidth={saveHeaderColumnWidth}
            onSaveLineColumnWidth={saveLineColumnWidth}
            reorderingColumns={savingColumns}
          />
        </div>
      )}

      <PurchaseOrderAddColumnDialog
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        onAdd={addColumn}
      />
    </div>
  );
}
