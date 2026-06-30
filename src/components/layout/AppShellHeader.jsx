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
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from '@fluentui/react-icons';
import { APP_DISPLAY_NAME } from '../../config/app';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('12px', '20px'),
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: tokens.shadow4,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  headerLeft: { display: 'flex', alignItems: 'center', ...shorthands.gap('16px') },
  brand: { display: 'flex', alignItems: 'center', ...shorthands.gap('10px') },
  logo: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  headerRight: { display: 'flex', alignItems: 'center', ...shorthands.gap('16px') },
  menuBackdrop: { position: 'fixed', inset: 0, zIndex: 2999 },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    borderRadius: '8px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('16px'),
    minWidth: '240px',
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  menuUserRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    marginBottom: '12px',
  },
  menuDivider: {
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    paddingTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  menuButton: { justifyContent: 'flex-start' },
});

export default function AppShellHeader({
  sidebarOpen,
  onToggleSidebar,
  isDarkMode,
  onToggleTheme,
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
      <div className={styles.headerLeft}>
        <Button
          appearance={sidebarOpen ? 'primary' : 'subtle'}
          icon={<Navigation24Regular />}
          onClick={onToggleSidebar}
          aria-label="Zijbalk openen of sluiten"
        />
        <div className={styles.brand}>
          <img src="/logo-circle.png" alt={APP_DISPLAY_NAME + ' logo'} className={styles.logo} />
          <Text size={500} weight="semibold" style={{ userSelect: 'none', whiteSpace: 'nowrap' }}>
            {APP_DISPLAY_NAME}
          </Text>
        </div>
      </div>

      <div className={styles.headerRight}>
        <Button
          appearance="subtle"
          icon={isDarkMode ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
          onClick={onToggleTheme}
          aria-label={isDarkMode ? 'Licht thema' : 'Donker thema'}
        />

        {user && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={onToggleUserMenu}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Gebruikersmenu"
            >
              <Avatar name={avatarName} size={36} color="colorful" />
            </button>

            {userMenuOpen && (
              <>
                <div className={styles.menuBackdrop} onClick={onCloseUserMenu} />
                <div className={styles.menu}>
                  <div className={styles.menuUserRow}>
                    <Avatar name={avatarName} size={48} color="colorful" />
                    <div>
                      <Text weight="semibold" block>{avatarName}</Text>
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{user.email}</Text>
                    </div>
                  </div>
                  <div className={styles.menuDivider}>
                    {canAccessAdmin && (
                      <Button
                        appearance="subtle"
                        icon={<Person24Regular />}
                        className={styles.menuButton}
                        onClick={() => { onNavigateAdmin(); onCloseUserMenu(); }}
                      >
                        Admin
                      </Button>
                    )}
                    <Button
                      appearance="subtle"
                      className={styles.menuButton}
                      onClick={onLogout}
                    >
                      Uitloggen
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
