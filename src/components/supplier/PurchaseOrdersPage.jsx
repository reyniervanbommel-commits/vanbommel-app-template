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
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';
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
    display: 'flex',
    '& > *': {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      scrollbarGutter: 'stable',
    },
  },
});

export default function PurchaseOrdersPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const [addColumnOpen, setAddColumnOpen] = useState(false);

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

  const relativeSynced = formatSyncedAt(syncedAt);

  return (
    <div className={styles.page}>
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
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? 'Vernieuwen...' : 'Vernieuwen'}
        </Button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <Spinner label="Purchase orders laden..." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Geen purchase orders gevonden"
          description="Vernieuw de gegevens of controleer de D365-synchronisatie."
        />
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
