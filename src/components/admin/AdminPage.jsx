import React, { useCallback, useState } from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import {
  Person24Regular,
  Table24Regular,
  CloudLink24Regular,
  Mail24Regular,
  Flowchart24Regular,
  History24Regular,
  ChartMultiple24Regular,
} from '@fluentui/react-icons';
import SidebarNavItem from '../shared/SidebarNavItem';
import UsersManagement from './UsersManagement';
import UserAnalytics from './UserAnalytics';
import AdminODataSettings from './AdminODataSettings';
import { AdminDataModel } from './datamodel';
import PasswordResetEmailTemplateSettings from './PasswordResetEmailTemplateSettings';
import AdminTrackChangesSettings from './AdminTrackChangesSettings';
import AdminRccpSettings from './AdminRccpSettings';

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
  const handleTabDataModel = useCallback(() => setAdminTab('datamodel'), []);
  const handleTabMailTemplate = useCallback(() => setAdminTab('mail-template'), []);
  const handleTabTrackChanges = useCallback(() => setAdminTab('track-changes'), []);
  const handleTabRccp = useCallback(() => setAdminTab('rccp'), []);

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <SidebarNavItem
          icon={Person24Regular}
          label="Users"
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
          icon={Flowchart24Regular}
          label="Data model"
          active={adminTab === 'datamodel'}
          onClick={handleTabDataModel}
        />
        <SidebarNavItem
          icon={Mail24Regular}
          label="Mail template"
          active={adminTab === 'mail-template'}
          onClick={handleTabMailTemplate}
        />
        <SidebarNavItem
          icon={History24Regular}
          label="Track changes"
          active={adminTab === 'track-changes'}
          onClick={handleTabTrackChanges}
        />
        <SidebarNavItem
          icon={ChartMultiple24Regular}
          label="RCCP"
          active={adminTab === 'rccp'}
          onClick={handleTabRccp}
        />
      </aside>

      <div className={styles.content}>
        {adminTab === 'users' && <UsersManagement />}
        {adminTab === 'analytics' && <UserAnalytics />}
        {adminTab === 'odata' && <AdminODataSettings />}
        {adminTab === 'datamodel' && <AdminDataModel />}
        {adminTab === 'mail-template' && <PasswordResetEmailTemplateSettings />}
        {adminTab === 'track-changes' && <AdminTrackChangesSettings />}
        {adminTab === 'rccp' && <AdminRccpSettings />}
      </div>
    </div>
  );
}
