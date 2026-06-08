import React, { useCallback, useMemo, useState } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Person24Regular, Table24Regular } from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import AppShellHeader from './AppShellHeader';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  body: {
    flex: 1,
    display: 'flex',
    position: 'relative',
  },
  rail: {
    width: '52px',
    position: 'fixed',
    top: '57px',
    left: 0,
    height: 'calc(100vh - 57px)',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.padding('8px', '4px'),
    ...shorthands.gap('8px'),
  },
  panel: {
    width: '260px',
    position: 'fixed',
    top: '57px',
    left: '52px',
    height: 'calc(100vh - 57px)',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    boxShadow: tokens.shadow16,
    zIndex: 1800,
    overflowY: 'auto',
    transitionProperty: 'transform, opacity',
    transitionDuration: '140ms',
    transitionTimingFunction: 'ease-in-out',
  },
  panelClosed: {
    transform: 'translateX(-12px)',
    opacity: 0,
    pointerEvents: 'none',
  },
  panelOpen: {
    transform: 'translateX(0)',
    opacity: 1,
    pointerEvents: 'auto',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 700,
    ...shorthands.padding('4px', '8px', '10px', '8px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    marginBottom: '2px',
  },
  navButton: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  railButton: {
    minWidth: '42px',
    width: '42px',
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '52px',
    transitionProperty: 'margin-left',
    transitionDuration: '140ms',
    transitionTimingFunction: 'ease-in-out',
  },
  mainShifted: {
    marginLeft: '312px',
  },
  panelBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1700,
    backgroundColor: 'transparent',
  },
});

export default function AppLayout({ children }) {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    (path) => {
      navigate(path);
      setUserMenuOpen(false);
    },
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.id}
                appearance={active ? 'primary' : 'subtle'}
                icon={<Icon />}
                className={styles.railButton}
                onClick={() => handleNavigate(item.path)}
                aria-label={item.label}
              />
            );
          })}
        </aside>

        {sidebarOpen ? <div className={styles.panelBackdrop} onClick={() => setSidebarOpen(false)} /> : null}

        <aside className={sidebarOpen ? `${styles.panel} ${styles.panelOpen}` : `${styles.panel} ${styles.panelClosed}`}>
          <div className={styles.panelTitle}>Navigatie</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.id}
                appearance={active ? 'primary' : 'subtle'}
                icon={<Icon />}
                className={styles.navButton}
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </aside>

        <main className={sidebarOpen ? `${styles.main} ${styles.mainShifted}` : styles.main}>{children}</main>
      </div>
    </div>
  );
}
