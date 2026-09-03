import React, { useCallback, useEffect, useState } from 'react';
import { makeStyles, tokens, shorthands, Text } from '@fluentui/react-components';
import UsersManagement from './UsersManagement';
import UserAnalytics from './UserAnalytics';
import AdminODataSettings from './AdminODataSettings';
import { AdminDataModel } from './datamodel';
import ExcelLinkWizard from './datamodel/ExcelLinkWizard';
import PasswordResetEmailTemplateSettings from './PasswordResetEmailTemplateSettings';
import AdminTrackChangesSettings from './AdminTrackChangesSettings';
import AdminD365Refresh from './AdminD365Refresh';
import AdminGeneralSettings from './AdminGeneralSettings';
import AdminSettingsSidebar from './AdminSettingsSidebar';
import { useAuth } from '../../context/AuthContext';
import { formatAudience, getSettingsTabRoles, getVisibleSettingsSections } from '../../utils/settingsAudience';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    ...shorthands.padding('28px', '32px'),
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: 'auto',
  },
  audience: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginBottom: tokens.spacingVerticalM,
  },
});

export default function AdminPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const userRole = user?.role;
  const [adminTab, setAdminTab] = useState('general');

  useEffect(() => {
    const visible = getVisibleSettingsSections(userRole).flatMap((section) => section.items);
    if (!visible.some((item) => item.id === adminTab)) {
      setAdminTab(visible[0]?.id || 'general');
    }
  }, [adminTab, userRole]);

  const handleSelectTab = useCallback((tabId) => {
    setAdminTab(tabId);
  }, []);

  return (
    <div className={styles.page}>
      <AdminSettingsSidebar
        userRole={userRole}
        activeTab={adminTab}
        onSelect={handleSelectTab}
      />

      <div className={styles.content}>
        <Text className={styles.audience}>
          Visible to: {formatAudience(getSettingsTabRoles(adminTab))}
        </Text>
        {adminTab === 'general' && <AdminGeneralSettings />}
        {adminTab === 'users' && <UsersManagement />}
        {adminTab === 'analytics' && <UserAnalytics />}
        {adminTab === 'mail-template' && <PasswordResetEmailTemplateSettings />}
        {adminTab === 'odata' && <AdminODataSettings />}
        {adminTab === 'datamodel' && <AdminDataModel />}
        {adminTab === 'external-links' && <ExcelLinkWizard />}
        {adminTab === 'track-changes' && <AdminTrackChangesSettings />}
        {adminTab === 'd365-refresh' && <AdminD365Refresh />}
      </div>
    </div>
  );
}
