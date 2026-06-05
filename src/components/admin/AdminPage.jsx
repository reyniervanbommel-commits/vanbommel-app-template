import React, { useCallback, useEffect, useState } from 'react';
import { Button, makeStyles, tokens, Spinner } from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import DataTable from '../shared/DataTable';
import StatusBadge from '../shared/StatusBadge';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';

const useStyles = makeStyles({
  page: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 600 },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
});

export default function AdminPage() {
  const styles = useStyles();
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleToggleLock(user) {
    try {
      await apiRequest('/admin/users/' + user.id, { method: 'PATCH', body: { is_locked: !user.is_locked } });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleForceReset(userId) {
    try {
      await apiRequest('/admin/users/' + userId + '/force-reset', { method: 'POST', body: {} });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(userId) {
    try {
      await apiRequest('/admin/users/' + userId, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: 'email', header: 'E-mailadres', render: u => u.email },
    { key: 'role', header: 'Rol', render: u => u.role },
    { key: 'status', header: 'Status', render: u => (
      <StatusBadge variant={u.is_locked ? 'error' : 'success'}>{u.is_locked ? 'Geblokkeerd' : 'Actief'}</StatusBadge>
    )},
    { key: 'actions', header: '', render: u => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="small" onClick={() => handleToggleLock(u)}>{u.is_locked ? 'Deblokkeren' : 'Blokkeren'}</Button>
        <Button size="small" onClick={() => handleForceReset(u.id)}>Reset mail</Button>
        <Button size="small" appearance="subtle" onClick={() => setDeleteTarget(u.id)}>Verwijderen</Button>
      </div>
    )},
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Gebruikersbeheer</div>
        <Button onClick={logout} appearance="subtle">Uitloggen</Button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {loading ? <Spinner /> : users.length === 0 ? (
        <EmptyState title="Geen gebruikers" description="Er zijn nog geen gebruikers aangemaakt." />
      ) : (
        <DataTable columns={columns} items={users} />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Gebruiker verwijderen"
        message="Weet je zeker dat je deze gebruiker wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmText="Verwijderen"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
