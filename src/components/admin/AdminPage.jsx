import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  Spinner,
  shorthands,
} from '@fluentui/react-components';
import { Person24Regular, Table24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import DataTable from '../shared/DataTable';
import StatusBadge from '../shared/StatusBadge';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import SidebarNavItem from '../shared/SidebarNavItem';

const useStyles = makeStyles({
  page: { display: 'flex', minHeight: '100%' },
  sidebar: {
    width: '220px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    paddingTop: '8px',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    ...shorthands.padding('28px', '32px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
});

export default function AdminPage() {
  const styles = useStyles();
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

  const handleToggleLock = useCallback(async (user) => {
    try {
      await apiRequest('/admin/users/' + user.id, { method: 'PATCH', body: { is_locked: !user.is_locked } });
      await loadUsers();
    } catch (err) { setError(err.message); }
  }, [loadUsers]);

  const handleForceReset = useCallback(async (userId) => {
    try {
      await apiRequest('/admin/users/' + userId + '/force-reset', { method: 'POST', body: {} });
    } catch (err) { setError(err.message); }
  }, []);

  const handleDelete = useCallback(async (userId) => {
    try {
      await apiRequest('/admin/users/' + userId, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) { setError(err.message); }
  }, [loadUsers]);

  const columns = [
    { key: 'email', header: 'E-mailadres', render: (u) => u.email },
    { key: 'role', header: 'Rol', render: (u) => u.role },
    {
      key: 'status', header: 'Status', render: (u) => (
        <StatusBadge variant={u.is_locked ? 'error' : 'success'}>
          {u.is_locked ? 'Geblokkeerd' : 'Actief'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions', header: '', render: (u) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="small" onClick={() => handleToggleLock(u)}>
            {u.is_locked ? 'Deblokkeren' : 'Blokkeren'}
          </Button>
          <Button size="small" onClick={() => handleForceReset(u.id)}>Reset mail</Button>
          <Button size="small" appearance="subtle" onClick={() => setDeleteTarget(u.id)}>
            Verwijderen
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <SidebarNavItem
          icon={Person24Regular}
          label="Gebruikers"
          active={adminTab === 'users'}
          onClick={() => setAdminTab('users')}
        />
        <SidebarNavItem
          icon={Table24Regular}
          label="Analytics"
          active={adminTab === 'analytics'}
          onClick={() => setAdminTab('analytics')}
        />
      </aside>

      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <Text size={600} weight="semibold">
            {adminTab === 'users' ? 'Gebruikersbeheer' : 'Analytics'}
          </Text>
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
      </div>

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
