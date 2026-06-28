import React, { useCallback, useMemo, useState } from 'react';
import { Button, makeStyles, Spinner, tokens } from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../shared/EmptyState';
import PurchaseOrderColumnsDialog from './PurchaseOrderColumnsDialog';
import PurchaseOrdersBoardTable from './PurchaseOrdersBoardTable';
import { usePurchaseOrdersPage } from '../../hooks/usePurchaseOrdersPage';

const useStyles = makeStyles({
  page: {
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
  actions: { display: 'flex', gap: '8px' },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
  warning: { color: tokens.colorPaletteDarkOrangeForeground1, marginBottom: '12px' },
});

export default function PurchaseOrdersPage() {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const baseColumns = useMemo(
    () => [
      { key: 'orderNumber', header: 'Item-ID', type: 'text', render: (item) => item.orderNumber || '-' },
      { key: 'vendorName', header: 'Itemnaam', type: 'text', render: (item) => item.vendorName || '-' },
      { key: 'vendorAccount', header: 'Vendor', type: 'text', render: (item) => item.vendorAccount || '-' },
      { key: 'status', header: 'Groep', type: 'text', render: (item) => item.status || '-' },
      { key: 'vendorGroup', header: 'Vendor groep', type: 'text', render: (item) => item.vendorGroup || '-' },
      { key: 'lineCount', header: 'Subitems', type: 'text', render: (item) => String(item.lineCount ?? 0) },
      { key: 'currencyCode', header: 'Valuta', type: 'text', render: (item) => item.currencyCode || '-' },
      {
        key: 'requestedDeliveryDate',
        header: 'Leverdatum',
        type: 'date',
        render: (item) => item.requestedDeliveryDate || '-',
      },
    ],
    []
  );

  const defaultColumnKeys = useMemo(
    () => baseColumns.map((column) => column.key),
    [baseColumns]
  );

  const {
    purchaseOrders,
    meta,
    loading,
    error,
    visibleColumnKeys,
    columnOrder,
    savingColumns,
    saveVisibleColumns,
    refresh,
  } = usePurchaseOrdersPage(defaultColumnKeys);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleOpenColumnsDialog = useCallback(() => {
    setColumnsDialogOpen(true);
  }, []);

  const handleCloseColumnsDialog = useCallback((nextOpen) => {
    setColumnsDialogOpen(nextOpen);
  }, []);

  const selectedColumns = useMemo(() => {
    const byKey = new Map(baseColumns.map((column) => [column.key, column]));
    const orderedKeys = [
      ...columnOrder.filter((key) => byKey.has(key)),
      ...baseColumns.map((column) => column.key).filter((key) => !columnOrder.includes(key)),
    ];

    return orderedKeys
      .filter((key) => visibleColumnKeys.includes(key))
      .map((key) => byKey.get(key))
      .filter(Boolean);
  }, [baseColumns, columnOrder, visibleColumnKeys]);

  const columns = selectedColumns;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.title}>Supplier Portal - Purchase Orders</div>
          <div className={styles.subtitle}>
            Ingelogd als {user?.email || 'onbekend'} | Totaal: {meta.total}
          </div>
        </div>
        <div className={styles.actions}>
          <Button appearance="subtle" onClick={handleOpenColumnsDialog}>
            Kolommen
          </Button>
          <Button onClick={refresh}>Vernieuwen</Button>
          <Button onClick={handleLogout} appearance="subtle">
            Uitloggen
          </Button>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {meta.truncated ? (
        <div className={styles.warning}>
          Niet alle rijen geladen. Verfijn filters in D365 of verhoog backend-limiet.
        </div>
      ) : null}

      {loading ? (
        <Spinner label="Purchase orders laden..." />
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          title="Geen purchase orders gevonden"
          description="Controleer D365 OData configuratie of probeer opnieuw te laden."
        />
      ) : (
        <PurchaseOrdersBoardTable columns={columns} items={purchaseOrders} />
      )}

      <PurchaseOrderColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={handleCloseColumnsDialog}
        columnOptions={baseColumns}
        visibleColumnKeys={visibleColumnKeys}
        onSave={saveVisibleColumns}
        saving={savingColumns}
      />
    </div>
  );
}
