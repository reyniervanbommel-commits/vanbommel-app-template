import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '../utils/api';

const PAGE_LABEL_MAP = {
  home: 'Hoofdpagina',
  supplier: 'Purchase orders',
  settings: 'Instellingen',
};

/**
 * useUsersManagement
 * Beheert state en handlers voor het gebruikersbeheer scherm.
 */
export function useUsersManagement() {
  const [users, setUsers] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permDialogUser, setPermDialogUser] = useState(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [deleteDialogUser, setDeleteDialogUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recentlyUpdatedUserId, setRecentlyUpdatedUserId] = useState(null);
  const [resetLink, setResetLink] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/users');
      const userList = data.users || [];
      setUsers(userList);

      const permissionsMap = {};
      await Promise.all(userList.map(async (user) => {
        try {
          const perms = await apiRequest(`/admin/users/${user.id}/permissions`);
          permissionsMap[user.id] = perms.map((p) => p.page_name);
        } catch {
          permissionsMap[user.id] = [];
        }
      }));
      setUserPermissions(permissionsMap);
    } catch (err) {
      setError(err.message || 'Laden van gebruikers mislukt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter((u) =>
      u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleLockToggle = useCallback(async (userId, isLocked) => {
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: { is_locked: !isLocked } });
      loadUsers();
    } catch (err) { setError(err.message); }
  }, [loadUsers]);

  const handleMfaRequiredToggle = useCallback(async (userId, isRequired) => {
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: { mfa_required: !isRequired } });
      loadUsers();
    } catch (err) { setError(err.message); }
  }, [loadUsers]);

  const handleForceReset = useCallback(async (userId) => {
    try {
      const data = await apiRequest(`/admin/users/${userId}/force-reset`, { method: 'POST', body: {} });
      setResetLink(data.resetUrl || null);
      loadUsers();
    } catch (err) { setError(err.message); }
  }, [loadUsers]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialogUser) return;
    try {
      await apiRequest(`/admin/users/${deleteDialogUser.id}`, { method: 'DELETE' });
      setDeleteDialogOpen(false);
      setDeleteDialogUser(null);
      loadUsers();
    } catch (err) {
      setError(err.message);
      setDeleteDialogOpen(false);
    }
  }, [deleteDialogUser, loadUsers]);

  const handleDeleteClick = useCallback((user) => {
    setDeleteDialogUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditPermissions = useCallback((user) => {
    setPermDialogUser(user);
    setPermDialogOpen(true);
  }, []);

  const handlePermissionsSaved = useCallback(() => {
    const userId = permDialogUser?.id;
    loadUsers();
    if (userId) {
      setRecentlyUpdatedUserId(userId);
      setTimeout(() => setRecentlyUpdatedUserId(null), 2000);
    }
  }, [permDialogUser?.id, loadUsers]);

  const getDisplayPermissions = useCallback((rawPermissions) => {
    return rawPermissions
      .map((perm) => PAGE_LABEL_MAP[perm])
      .filter(Boolean);
  }, []);

  return {
    users, filteredUsers, userPermissions, loading, error,
    searchTerm, setSearchTerm,
    createDialogOpen, setCreateDialogOpen,
    permDialogUser, permDialogOpen, setPermDialogOpen,
    deleteDialogUser, deleteDialogOpen, setDeleteDialogOpen,
    recentlyUpdatedUserId, resetLink, setResetLink,
    loadUsers, handleLockToggle, handleMfaRequiredToggle,
    handleForceReset, handleDeleteClick, handleDeleteConfirm,
    handleEditPermissions, handlePermissionsSaved, getDisplayPermissions,
  };
}
