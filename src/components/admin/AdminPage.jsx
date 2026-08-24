import React, { useCallback, useState } from 'react';
import { makeStyles, tokens, shorthands, Text } from '@fluentui/react-components';
import {
  Person24Regular,
  Table24Regular,
  CloudLink24Regular,
  Mail24Regular,
  Flowchart24Regular,
  History24Regular,
  ArrowClockwise24Regular,
  Link24Regular,
} from '@fluentui/react-icons';
import SidebarNavItem from '../shared/SidebarNavItem';
import UsersManagement from './UsersManagement';
import UserAnalytics from './UserAnalytics';
import AdminODataSettings from './AdminODataSettings';
import { AdminDataModel } from './datamodel';
import ExcelLinkWizard from './datamodel/ExcelLinkWizard';
import PasswordResetEmailTemplateSettings from './PasswordResetEmailTemplateSettings';
import AdminTrackChangesSettings from './AdminTrackChangesSettings';
import AdminD365Refresh from './AdminD365Refresh';
import { useAuth } from '../../context/AuthContext';

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
  sectionHeading: {
    ...shorthands.margin(0),
    ...shorthands.padding('12px', '14px', '4px', '16px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [adminTab, setAdminTab] = useState('users');

  const handleTabUsers = useCallback(() => setAdminTab('users'), []);
  const handleTabAnalytics = useCallback(() => setAdminTab('analytics'), []);
  const handleTabOdata = useCallback(() => setAdminTab('odata'), []);
  const handleTabDataModel = useCallback(() => setAdminTab('datamodel'), []);
  const handleTabExternalLinks = useCallback(() => setAdminTab('external-links'), []);
  const handleTabMailTemplate = useCallback(() => setAdminTab('mail-template'), []);
  const handleTabTrackChanges = useCallback(() => setAdminTab('track-changes'), []);
  const handleTabD365Refresh = useCallback(() => setAdminTab('d365-refresh'), []);

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <Text as="h2" className={styles.sectionHeading}>People</Text>
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
          icon={Mail24Regular}
          label="Mail template"
          active={adminTab === 'mail-template'}
          onClick={handleTabMailTemplate}
        />
        <Text as="h2" className={styles.sectionHeading}>Data</Text>
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
          icon={Link24Regular}
          label="External links"
          active={adminTab === 'external-links'}
          onClick={handleTabExternalLinks}
        />
        <SidebarNavItem
          icon={History24Regular}
          label="Track changes"
          active={adminTab === 'track-changes'}
          onClick={handleTabTrackChanges}
        />
        {isAdmin ? (
          <SidebarNavItem
            icon={ArrowClockwise24Regular}
            label="D365 refresh"
            active={adminTab === 'd365-refresh'}
            onClick={handleTabD365Refresh}
          />
        ) : null}
      </aside>

      <div className={styles.content}>
        {adminTab === 'users' && <UsersManagement />}
        {adminTab === 'analytics' && <UserAnalytics />}
        {adminTab === 'mail-template' && <PasswordResetEmailTemplateSettings />}
        {adminTab === 'odata' && <AdminODataSettings />}
        {adminTab === 'datamodel' && <AdminDataModel />}
        {adminTab === 'external-links' && <ExcelLinkWizard />}
        {adminTab === 'track-changes' && <AdminTrackChangesSettings />}
        {isAdmin && adminTab === 'd365-refresh' && <AdminD365Refresh />}
      </div>
    </div>
  );
}
