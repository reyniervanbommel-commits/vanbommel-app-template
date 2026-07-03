import React, { useCallback, useState } from 'react';
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
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
import { usePurchaseOrderRefreshProgress } from '../../hooks/usePurchaseOrderRefreshProgress';
import { useAuth } from '../../context/AuthContext';
import { formatSyncedAt } from '../../utils/purchaseOrderFormat';

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
  } = usePurchaseOrdersPage();

  const isAdmin = user?.role === 'admin';

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
            onSaveValue={saveValue}
            onRenameColumn={renameColumn}
            onRemoveColumn={removeColumn}
            onCorrect={correctField}
            isAdmin={isAdmin}
            onToggleWriteback={toggleWriteback}
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
