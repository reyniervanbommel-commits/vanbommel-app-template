import React from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  MessageBar,
  MessageBarBody,
  Input,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHeaderCell,
  Badge,
  shorthands,
} from '@fluentui/react-components';
import {
  CheckmarkCircle24Regular,
  Circle24Regular,
  Edit24Regular,
  Search24Regular,
} from '@fluentui/react-icons';
import CreateUserDialog from './CreateUserDialog';
import EditPermissionsDialog from './EditPermissionsDialog';
import { UserSecurityActions } from './UserSecurityActions';
import { useUsersManagement } from '../../hooks/useUsersManagement';
import { ROLES } from '../../constants/roles';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px') },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  table: { width: '100%' },
  permBadge: { cursor: 'default' },
  permissionStateCell: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px') },
  permissionOn: { color: tokens.colorPaletteGreenForeground1, display: 'inline-flex', alignItems: 'center' },
  permissionOff: { color: tokens.colorPaletteRedForeground1, display: 'inline-flex', alignItems: 'center' },
  permissionsButton: { minWidth: '120px' },
  noPerms: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
  permUpdated: {
    animationName: {
      from: { backgroundColor: tokens.colorPaletteGreenBackground1 },
      to: { backgroundColor: 'transparent' },
    },
    animationDuration: '1.5s',
    animationTimingFunction: 'ease-out',
  },
});

export default function UsersManagement() {
  const styles = useStyles();
  const {
    filteredUsers,
    userPermissions,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    createDialogOpen,
    setCreateDialogOpen,
    permDialogUser,
    permDialogOpen,
    setPermDialogOpen,
    deleteDialogUser,
    deleteDialogOpen,
    setDeleteDialogOpen,
    recentlyUpdatedUserId,
    resetMessage,
    setResetMessage,
    loadUsers,
    handleLockToggle,
    handleMfaRequiredToggle,
    handleForceReset,
    handleDeleteClick,
    handleDeleteConfirm,
    handleEditPermissions,
    handlePermissionsSaved,
    getDisplayPermissions,
  } = useUsersManagement();

  if (loading) return <Text>Laden...</Text>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={600} weight="semibold">Gebruikersbeheer</Text>
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onUserCreated={loadUsers}
        />
      </div>

      <Input
        placeholder="Zoeken op e-mail of rol..."
        value={searchTerm}
        onChange={(_, d) => setSearchTerm(d.value)}
        contentBefore={<Search24Regular />}
        style={{ minWidth: '280px', maxWidth: '360px' }}
      />

      {error && (
        <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>
      )}
      {resetMessage && (
        <MessageBar intent="success">
          <MessageBarBody>{resetMessage}</MessageBarBody>
          <Button appearance="subtle" size="small" onClick={() => setResetMessage('')}>Sluiten</Button>
        </MessageBar>
      )}

      <Table className={styles.table}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>E-mail</TableHeaderCell>
            <TableHeaderCell>Rol</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Rechten</TableHeaderCell>
            <TableHeaderCell>Pagina-toegang</TableHeaderCell>
            <TableHeaderCell>Acties</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => {
            const rawPermissions = userPermissions[user.id] || [];
            const displayPermissions = getDisplayPermissions(rawPermissions);
            const isUpdated = recentlyUpdatedUserId === user.id;

            return (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge appearance={user.role === ROLES.ADMIN ? 'filled' : 'outline'}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  {user.is_locked && <Badge appearance="filled" color="danger">Geblokkeerd</Badge>}
                  {!user.is_locked && <Badge appearance="outline" color="success">Actief</Badge>}
                  {user.must_set_password && <Badge appearance="outline" color="warning">Wachtwoord instellen</Badge>}
                  {user.mfa_required && <Badge appearance="filled" color="brand">MFA verplicht</Badge>}
                  {user.mfa_enabled && <Badge appearance="outline" color="success">MFA actief</Badge>}
                </TableCell>
                <TableCell className={isUpdated ? styles.permUpdated : undefined}>
                  <div className={styles.permissionStateCell}>
                    {displayPermissions.length > 0 ? (
                      <>
                        <span className={styles.permissionOn}><CheckmarkCircle24Regular /></span>
                        <Text size={200}>Ingeschakeld</Text>
                      </>
                    ) : (
                      <>
                        <span className={styles.permissionOff}><Circle24Regular /></span>
                        <Text size={200}>Geen rechten</Text>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className={isUpdated ? styles.permUpdated : undefined}>
                  <Button
                    appearance="secondary"
                    icon={<Edit24Regular />}
                    size="small"
                    className={styles.permissionsButton}
                    onClick={() => handleEditPermissions(user)}
                    title="Rechten beheren"
                  >
                    Rechten
                  </Button>
                  {displayPermissions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {displayPermissions.map((label) => (
                        <Badge key={label} appearance="tint" color="brand" size="small" className={styles.permBadge}>
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Text size={200} className={styles.noPerms}>Geen pagina-rechten</Text>
                  )}
                </TableCell>
                <TableCell>
                  <UserSecurityActions
                    user={user}
                    onEditPermissions={handleEditPermissions}
                    onLockToggle={handleLockToggle}
                    onMfaRequiredToggle={handleMfaRequiredToggle}
                    onForceReset={handleForceReset}
                    onDeleteClick={handleDeleteClick}
                  />
                </TableCell>
              </TableRow>
            );
          })}
          {filteredUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Text className={styles.noPerms}>Geen gebruikers gevonden</Text>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <EditPermissionsDialog
        user={permDialogUser}
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        onSaved={handlePermissionsSaved}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={(_, d) => setDeleteDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Gebruiker verwijderen</DialogTitle>
            <DialogContent>
              Weet je zeker dat je <strong>{deleteDialogUser?.email}</strong> wilt verwijderen?
              Dit kan niet ongedaan worden gemaakt.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Annuleren</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeleteConfirm} style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}>
                Verwijderen
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}