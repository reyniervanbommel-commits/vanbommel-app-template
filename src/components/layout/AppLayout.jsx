import React, { useCallback, useMemo, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Person24Regular, Table24Regular } from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import AppShellHeader from './AppShellHeader';
import SidebarNavItem from '../shared/SidebarNavItem';

const RAIL_WIDTH = 48;
const PANEL_WIDTH = 260;
const HEADER_HEIGHT = '57px';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  body: { flex: 1, display: 'flex', position: 'relative' },
  rail: {
    width: `${RAIL_WIDTH}px`,
    position: 'fixed',
    top: HEADER_HEIGHT,
    left: 0,
    height: `calc(100vh - ${HEADER_HEIGHT})`,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: '8px',
    zIndex: 1500,
    overflowX: 'visible',
  },
  railItem: {
    position: 'relative',
    '&:hover > [data-tooltip]': { opacity: 1, visibility: 'visible', transitionDelay: '0.7s' },
  },
  railTooltip: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '10px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.padding('6px', '10px'),
    ...shorthands.borderRadius('4px'),
    boxShadow: tokens.shadow8,
    whiteSpace: 'nowrap',
    fontSize: '12px',
    fontWeight: 500,
    opacity: 0,
    visibility: 'hidden',
    transitionProperty: 'opacity, visibility',
    transitionDuration: '0.1s',
    transitionDelay: '0s',
    pointerEvents: 'none',
    zIndex: 2000,
  },
  panel: {
    position: 'fixed',
    top: HEADER_HEIGHT,
    left: `${RAIL_WIDTH}px`,
    width: `${PANEL_WIDTH}px`,
    height: `calc(100vh - ${HEADER_HEIGHT})`,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    paddingTop: '8px',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: tokens.shadow16,
    zIndex: 1800,
    overflowY: 'auto',
    transitionProperty: 'transform, opacity',
    transitionDuration: '140ms',
    transitionTimingFunction: 'ease-in-out',
  },
  panelClosed: { transform: 'translateX(-8px)', opacity: 0, pointerEvents: 'none' },
  panelOpen: { transform: 'translateX(0)', opacity: 1, pointerEvents: 'auto' },
  panelBackdrop: { position: 'fixed', inset: 0, zIndex: 1700, backgroundColor: 'transparent' },
  main: {
    flex: 1,
    minWidth: 0,
    marginLeft: `${RAIL_WIDTH}px`,
    ...shorthands.padding('28px', '32px'),
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: 'auto',
  },
});

export default function AppLayout({ children, isDarkMode, onToggleTheme }) {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAdminLike = user?.role === ROLES.ADMIN || user?.role === ROLES.EMPLOYEE;

  const navItems = useMemo(
    () => [
      { id: 'po', label: 'Purchase orders', icon: Table24Regular, path: '/' },
      ...(isAdminLike ? [{ id: 'admin', label: 'Gebruikersbeheer', icon: Person24Regular, path: '/admin' }] : []),
    ],
    [isAdminLike]
  );

  const handleNavigate = useCallback(
    (path) => { navigate(path); setSidebarOpen(false); setUserMenuOpen(false); },
    [navigate]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className={styles.root}>
      <AppShellHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        user={user}
        userMenuOpen={userMenuOpen}
        onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
        onCloseUserMenu={() => setUserMenuOpen(false)}
        canAccessAdmin={isAdminLike}
        onNavigateAdmin={() => handleNavigate('/admin')}
        onLogout={handleLogout}
      />

      <div className={styles.body}>
        <aside className={styles.rail}>
          {navItems.map((item) => (
            <div key={item.id} className={styles.railItem}>
              <SidebarNavItem
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                compact
              />
              <span data-tooltip className={styles.railTooltip}>{item.label}</span>
            </div>
          ))}
        </aside>

        {sidebarOpen && (
          <div className={styles.panelBackdrop} onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={sidebarOpen
          ? `${styles.panel} ${styles.panelOpen}`
          : `${styles.panel} ${styles.panelClosed}`}
        >
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
            />
          ))}
        </aside>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
