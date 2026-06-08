import React, { useCallback, useEffect, useState } from 'react';
import { Button, makeStyles, tokens, Spinner, Text, shorthands } from '@fluentui/react-components';
import { Person24Regular, Table24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import DataTable from '../shared/DataTable';
import StatusBadge from '../shared/StatusBadge';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';

const useStyles = makeStyles({
  page: { display: 'flex', minHeight: '100%' },
  nav: {
    width: '220px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  navTitle: {
    ...shorthands.padding('4px', '8px', '10px', '8px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    marginBottom: '2px',
  },
  navButton: { justifyContent: 'flex-start' },
  content: { flex: 1, ...shorthands.padding('24px') },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 600 },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
});

export default function AdminPage() {
  const styles = useStyles();
  const { logout } = useAuth();
  const [adminTab, setAdminTab] = useState('users');
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
      <aside className={styles.nav}>
        <Text size={500} weight="semibold" className={styles.navTitle}>
          Admin
        </Text>
        <Button
          appearance={adminTab === 'users' ? 'primary' : 'subtle'}
          icon={<Person24Regular />}
          className={styles.navButton}
          onClick={() => setAdminTab('users')}
        >
          Gebruikers
        </Button>
        <Button
          appearance={adminTab === 'analytics' ? 'primary' : 'subtle'}
          icon={<Table24Regular />}
          className={styles.navButton}
          onClick={() => setAdminTab('analytics')}
        >
          Analytics
        </Button>
      </aside>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.title}>{adminTab === 'users' ? 'Gebruikersbeheer' : 'Analytics (placeholder)'}</div>
          <Button onClick={logout} appearance="subtle">Uitloggen</Button>
        </div>

        {adminTab === 'analytics' ? (
          <EmptyState title="Analytics" description="Analytics-overzicht volgt in een volgende stap." />
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}
            {loading ? <Spinner /> : users.length === 0 ? (
              <EmptyState title="Geen gebruikers" description="Er zijn nog geen gebruikers aangemaakt." />
            ) : (
              <DataTable columns={columns} items={users} />
            )}
          </>
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
    </div>
  );
}
