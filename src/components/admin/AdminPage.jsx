import React, { useCallback, useState } from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import {
  Person24Regular,
  Table24Regular,
  CloudLink24Regular,
  Mail24Regular,
} from '@fluentui/react-icons';
import SidebarNavItem from '../shared/SidebarNavItem';
import UsersManagement from './UsersManagement';
import UserAnalytics from './UserAnalytics';
import AdminODataSettings from './AdminODataSettings';
import PasswordResetEmailTemplateSettings from './PasswordResetEmailTemplateSettings';

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
    overflowY: 'auto',
  },
});

export default function AdminPage() {
  const styles = useStyles();
  const [adminTab, setAdminTab] = useState('users');

  const handleTabUsers = useCallback(() => setAdminTab('users'), []);
  const handleTabAnalytics = useCallback(() => setAdminTab('analytics'), []);
  const handleTabOdata = useCallback(() => setAdminTab('odata'), []);
  const handleTabMailTemplate = useCallback(() => setAdminTab('mail-template'), []);

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <SidebarNavItem
          icon={Person24Regular}
          label="Gebruikers"
          active={adminTab === 'users'}
          onClick={handleTabUsers}
        />
        <SidebarNavItem
          icon={Table24Regular}
          label="Analytics"
          active={adminTab === 'analytics'}
          onClick={handleTabAnalytics}
        />
        <SidebarNavItem
          icon={CloudLink24Regular}
          label="OData"
          active={adminTab === 'odata'}
          onClick={handleTabOdata}
        />
        <SidebarNavItem
          icon={Mail24Regular}
          label="Mail template"
          active={adminTab === 'mail-template'}
          onClick={handleTabMailTemplate}
        />
      </aside>

      <div className={styles.content}>
        {adminTab === 'users' && <UsersManagement />}
        {adminTab === 'analytics' && <UserAnalytics />}
        {adminTab === 'odata' && <AdminODataSettings />}
        {adminTab === 'mail-template' && <PasswordResetEmailTemplateSettings />}
      </div>
    </div>
  );
}
