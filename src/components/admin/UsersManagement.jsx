import React from 'react';
import {
  makeStyles, tokens, shorthands, Button, Text, Badge, Input,
  Table, TableBody, TableCell, TableRow, TableHeader, TableHeaderCell,
  MessageBar, MessageBarBody,
  Dialog, DialogTrigger, DialogSurface, DialogTitle, DialogBody,
  DialogActions, DialogContent,
} from '@fluentui/react-components';
import { Search24Regular, CheckmarkCircle24Regular, Circle24Regular } from '@fluentui/react-icons';
import CreateUserDialog from './CreateUserDialog';
import EditPermissionsDialog from './EditPermissionsDialog';
import { UserSecurityActions } from './UserSecurityActions';
import { useUsersManagement } from '../../hooks/useUsersManagement';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px') },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  toolbar: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px') },
  permOn: { color: tokens.colorPaletteGreenForeground1, display: 'inline-flex', alignItems: 'center', ...shorthands.gap('4px') },
  permOff: { color: tokens.colorPaletteRedForeground1, display: 'inline-flex', alignItems: 'center', ...shorthands.gap('4px') },
  noPerms: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
  updated: {
    animationName: { from: { backgroundColor: tokens.colorPaletteGreenBackground1 }, to: { backgroundColor: 'transparent' } },
    animationDuration: '1.5s',
    animationTimingFunction: 'ease-out',
  },
});

export default function UsersManagement() {
  const styles = useStyles();
  const {
    filteredUsers, userPermissions, loading, error,
    searchTerm, setSearchTerm,
    createDialogOpen, setCreateDialogOpen,
    permDialogUser, permDialogOpen, setPermDialogOpen,
    deleteDialogUser, deleteDialogOpen, setDeleteDialogOpen,
    recentlyUpdatedUserId, resetLink, setResetLink,
    loadUsers, handleLockToggle, handleMfaRequiredToggle,
    handleForceReset, handleDeleteClick, handleDeleteConfirm,
    handleEditPermissions, handlePermissionsSaved, getDisplayPermissions,
  } = useUsersManagement();

  if (loading) return <Text>Laden...</Text>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={600} weight="semibold">Gebruikersbeheer</Text>
        <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onUserCreated={loadUsers} />
      </div>

      <div className={styles.toolbar}>
        <Input placeholder="Zoeken op e-mail of rol..." value={searchTerm}
          onChange={(_, d) => setSearchTerm(d.value)}
          contentBefore={<Search24Regular />} style={{ minWidth: '280px' }} />
      </div>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {resetLink && (
        <MessageBar intent="success">
          <MessageBarBody>Reset-link aangemaakt: <a href={resetLink}>{resetLink}</a></MessageBarBody>
          <Button appearance="subtle" size="small" onClick={() => setResetLink(null)}>Sluiten</Button>
        </MessageBar>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>E-mailadres</TableHeaderCell>
            <TableHeaderCell>Rol</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Rechten</TableHeaderCell>
            <TableHeaderCell>Acties</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => {
            const rawPerms = userPermissions[user.id] || [];
            const displayPerms = getDisplayPermissions(rawPerms);
            const isUpdated = recentlyUpdatedUserId === user.id;

            return (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge appearance={user.role === 'superuser' || user.role === 'admin' ? 'filled' : 'outline'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_locked
                    ? <Badge appearance="filled" color="danger">Geblokkeerd</Badge>
                    : <Badge appearance="outline" color="success">Actief</Badge>}
                  {user.mfa_required && <Badge appearance="filled" color="brand" style={{ marginLeft: 4 }}>MFA</Badge>}
                </TableCell>
                <TableCell className={isUpdated ? styles.updated : undefined}>
                  {displayPerms.length > 0 ? (
                    <span className={styles.permOn}>
                      <CheckmarkCircle24Regular />
                      <Text size={200}>{displayPerms.join(', ')}</Text>
                    </span>
                  ) : (
                    <span className={styles.permOff}>
                      <Circle24Regular />
                      <Text size={200} className={styles.noPerms}>Geen rechten</Text>
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <UserSecurityActions user={user}
                    onEditPermissions={handleEditPermissions}
                    onLockToggle={handleLockToggle}
                    onMfaRequiredToggle={handleMfaRequiredToggle}
                    onForceReset={handleForceReset}
                    onDeleteClick={handleDeleteClick} />
                </TableCell>
              </TableRow>
            );
          })}
          {filteredUsers.length === 0 && (
            <TableRow><TableCell colSpan={5}><Text className={styles.noPerms}>Geen gebruikers gevonden</Text></TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <EditPermissionsDialog user={permDialogUser} open={permDialogOpen}
        onOpenChange={setPermDialogOpen} onSaved={handlePermissionsSaved} />

      <Dialog open={deleteDialogOpen} onOpenChange={(_, d) => setDeleteDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Gebruiker verwijderen</DialogTitle>
            <DialogContent>
              Weet je zeker dat je <strong>{deleteDialogUser?.email}</strong> wilt verwijderen?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Annuleren</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeleteConfirm}
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}>
                Verwijderen
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
