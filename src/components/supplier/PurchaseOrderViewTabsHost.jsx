import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { PurchaseOrderViewTabBar } from './viewTabs';

const useStyles = makeStyles({
  wrap: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: tokens.spacingVerticalL,
  },
});

export default function PurchaseOrderViewTabsHost({
  activeViewId,
  viewTabs,
  columns = [],
  canManage,
}) {
  const styles = useStyles();
  if (!activeViewId) return null;

  return (
    <div className={styles.wrap}>
      <PurchaseOrderViewTabBar
        activeTabId={viewTabs.activeTabId}
        extraTabs={viewTabs.extraTabs}
        groups={viewTabs.groups}
        canManage={canManage}
        onSelectTab={viewTabs.selectTab}
        onRemoveTab={viewTabs.removeTab}
        columns={columns}
      />
    </div>
  );
}
