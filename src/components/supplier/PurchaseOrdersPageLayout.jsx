import React from 'react';
import { makeStyles } from '@fluentui/react-components';
import PurchaseOrdersPageContent from './PurchaseOrdersPageContent';
import PurchaseOrdersPageTopBar from './PurchaseOrdersPageTopBar';
import PurchaseOrdersPageDialogs from './PurchaseOrdersPageDialogs';
import ViewTabsDialogsProvider from './viewTabs/ViewTabsDialogsProvider';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    paddingTop: '24px',
    paddingBottom: '24px',
  },
});

export default function PurchaseOrdersPageLayout({
  viewTabs,
  columns,
  isStaff,
  activeViewId,
  savedViewsState,
  headerState,
  activityState,
  bulkState,
  hiddenRowsState,
  refreshState,
  onExportExcel,
  error,
  contentStatus,
  tableContext,
  dialogs,
}) {
  const styles = useStyles();
  return (
    <ViewTabsDialogsProvider
      viewTabs={viewTabs}
      columns={columns}
      isStaff={isStaff}
      activeViewId={activeViewId}
    >
      <div className={styles.page}>
        <PurchaseOrdersPageTopBar
          savedViewsState={savedViewsState}
          headerState={headerState}
          activityState={activityState}
          bulkState={bulkState}
          hiddenRowsState={hiddenRowsState}
          refreshState={refreshState}
          onExportExcel={onExportExcel}
          error={error}
          columns={columns}
        />
        <PurchaseOrdersPageContent status={contentStatus} tableContext={tableContext} />
        <PurchaseOrdersPageDialogs
          formula={dialogs.formula}
          datePeriod={dialogs.datePeriod}
          bulkEdit={dialogs.bulkEdit}
        />
      </div>
    </ViewTabsDialogsProvider>
  );
}
