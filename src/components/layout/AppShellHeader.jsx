import React from 'react';
import {
  Avatar,
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  Navigation24Regular,
  Person24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('12px', '16px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    position: 'relative',
  },
  avatarButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  menuBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1499,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    minWidth: '220px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('12px'),
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  menuHeader: {
    ...shorthands.padding('4px', '8px', '8px', '8px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    marginBottom: '4px',
  },
  menuUserName: {
    fontWeight: 600,
  },
  menuUserEmail: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  menuButton: {
    justifyContent: 'flex-start',
  },
});

export default function AppShellHeader({
  sidebarOpen,
  onToggleSidebar,
  user,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  canAccessAdmin,
  onNavigateAdmin,
  onLogout,
}) {
  const styles = useStyles();
  const avatarName = user?.display_name || user?.email || 'Gebruiker';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Button
          appearance={sidebarOpen ? 'primary' : 'subtle'}
          icon={<Navigation24Regular />}
          onClick={onToggleSidebar}
          aria-label="Zijbalk openen of sluiten"
        />
        <Text size={500} weight="semibold">
          Supplier Portal
        </Text>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={onToggleUserMenu}
          aria-label="Gebruikersmenu openen"
        >
          <Avatar name={avatarName} size={36} color="colorful" />
        </button>

        {userMenuOpen ? <div className={styles.menuBackdrop} onClick={onCloseUserMenu} /> : null}
        {userMenuOpen ? (
          <div className={styles.menu}>
            <div className={styles.menuHeader}>
              <div className={styles.menuUserName}>{avatarName}</div>
              <div className={styles.menuUserEmail}>{user?.email || '-'}</div>
            </div>

            {canAccessAdmin ? (
              <Button
                appearance="subtle"
                icon={<Person24Regular />}
                className={styles.menuButton}
                onClick={onNavigateAdmin}
              >
                Admin
              </Button>
            ) : null}

            <Button appearance="subtle" className={styles.menuButton} onClick={onLogout}>
              Uitloggen
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
