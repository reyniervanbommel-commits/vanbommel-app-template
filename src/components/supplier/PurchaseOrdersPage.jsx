import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, makeStyles, Spinner, tokens } from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import DataTable from '../shared/DataTable';
import EmptyState from '../shared/EmptyState';

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
});

export default function PurchaseOrdersPage() {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, top: 25, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/purchase-orders?top=25&skip=0');
      setPurchaseOrders(data.purchaseOrders || []);
      setMeta(data.meta || { total: 0, top: 25, skip: 0 });
    } catch (err) {
      setError(err.message);
      setPurchaseOrders([]);
      setMeta({ total: 0, top: 25, skip: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const columns = useMemo(
    () => [
      { key: 'orderNumber', header: 'PO nummer', type: 'text', render: item => item.orderNumber || '-' },
      { key: 'vendorAccount', header: 'Leveranciersaccount', type: 'text', render: item => item.vendorAccount || '-' },
      { key: 'vendorName', header: 'Leverancier', type: 'text', render: item => item.vendorName || '-' },
      { key: 'status', header: 'Status', type: 'status', render: item => item.status || '-' },
      { key: 'currencyCode', header: 'Valuta', type: 'text', render: item => item.currencyCode || '-' },
      {
        key: 'requestedDeliveryDate',
        header: 'Gevraagde leverdatum',
        type: 'date',
        render: item => item.requestedDeliveryDate || '-',
      },
    ],
    []
  );

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
          <Button onClick={handleRefresh}>Vernieuwen</Button>
          <Button onClick={handleLogout} appearance="subtle">
            Uitloggen
          </Button>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <Spinner label="Purchase orders laden..." />
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          title="Geen purchase orders gevonden"
          description="Controleer D365 OData configuratie of probeer opnieuw te laden."
        />
      ) : (
        <DataTable columns={columns} items={purchaseOrders} />
      )}
    </div>
  );
}
