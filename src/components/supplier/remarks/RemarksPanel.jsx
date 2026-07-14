import React, { memo, useCallback, useMemo } from 'react';
import { Button, Tab, TabList } from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import RemarkComposer from './RemarkComposer';
import RowActivityFeed from './RowActivityFeed';
import { usePurchaseOrderRemarksController } from './usePurchaseOrderRemarksController';
import { layout } from '../../../styles/brandTokens';
import './remarks.css';

function renderColumnOption(column) {
  return (
    <option key={column.id} value={column.id}>
      {column.label}
    </option>
  );
}

function ColumnFilter({ columns, value, onChange }) {
  return (
    <label className="remarks-column-filter">
      <span>Column</span>
      <select value={value} onChange={onChange}>
        <option value="">All columns</option>
        {columns.map(renderColumnOption)}
      </select>
    </label>
  );
}

function HistoryActionFilter({ value, onChange }) {
  return (
    <label className="remarks-column-filter">
      <span>Action</span>
      <select value={value} onChange={onChange}>
        <option value="updated">Updated</option>
        <option value="all">All actions</option>
      </select>
    </label>
  );
}

function RemarksPanel({
  open,
  onClose,
  row,
  currentUser,
  columns = [],
  initialColumn = null,
  openerRef,
  tableKey = 'purchase-orders',
  summaryState = null,
}) {
  const controller = usePurchaseOrderRemarksController({
    open,
    onClose,
    row,
    initialColumn,
    openerRef,
    tableKey,
    summaryState,
  });
  const remarkItems = useMemo(
    () => controller.remarks.items.map((item) => ({ ...item, kind: 'remark' })),
    [controller.remarks.items]
  );
  const remarkActions = useMemo(
    () => ({
      onDelete: controller.remarks.deleteRemark,
      onReaction: controller.remarks.toggleReaction,
    }),
    [controller.remarks.deleteRemark, controller.remarks.toggleReaction]
  );
  const remarkCount = controller.remarks.total || controller.selectedSummary?.count || 0;
  const historyCount = controller.historyUpdatedCount;
  const showColumnFilter = controller.selectedTab !== 'remarks';
  const showHistoryActionFilter = controller.selectedTab === 'history';
  const showComposer = controller.selectedTab !== 'history';
  const activeFeed = controller.selectedTab === 'history' ? controller.history : controller.all;
  const orderNumber = row?.recordKey || row?.orderNumber || '';
  const handleSubmitRemark = useCallback(
    async (body, columnId) => {
      const remark = await controller.remarks.createRemark(body, columnId);
      if (controller.selectedTab === 'all') await controller.all.refresh();
      return remark;
    },
    [controller.all, controller.remarks, controller.selectedTab]
  );

  const panelStyle = useMemo(
    () => ({
      top: `${layout.headerHeight}px`,
      height: `calc(100vh - ${layout.headerHeight}px)`,
    }),
    []
  );

  if (!open) return null;

  return (
    <aside
      className="remarks-side-panel"
      style={panelStyle}
      aria-label={`Remarks for purchase order ${orderNumber}`}
    >
      <header className="remarks-panel-header">
        <Button
          className="remarks-close-button"
          appearance="subtle"
          aria-label="Close remarks panel"
          icon={<Dismiss24Regular />}
          onClick={onClose}
        />
        <h2 ref={controller.headingRef} className="remarks-heading" tabIndex={-1}>
          Purchase order {orderNumber}
          {initialColumn?.label ? <span className="remarks-header-context"> · {initialColumn.label}</span> : null}
        </h2>
      </header>
      <div className="remarks-panel-body">
        <div className="remarks-panel">
          <TabList className="remarks-tabs" selectedValue={controller.selectedTab} onTabSelect={controller.onTabSelect}>
            <Tab value="remarks">Remarks ({remarkCount})</Tab>
            <Tab value="history">History ({historyCount})</Tab>
            <Tab value="all">All</Tab>
          </TabList>

          {showColumnFilter ? (
            <ColumnFilter columns={columns} value={controller.columnId} onChange={controller.onColumnChange} />
          ) : null}

          {showHistoryActionFilter ? (
            <HistoryActionFilter
              value={controller.historyActionFilter}
              onChange={controller.onHistoryActionFilterChange}
            />
          ) : null}

          {showComposer ? (
            <RemarkComposer currentUser={currentUser} column={initialColumn} onSubmit={handleSubmitRemark} />
          ) : null}

          {controller.selectedTab === 'remarks' ? (
            <RowActivityFeed
              items={remarkItems}
              loading={controller.remarks.loading}
              error={controller.remarks.error}
              hasMore={controller.remarks.hasMore}
              emptyMessage="No remarks have been added yet."
              currentUser={currentUser}
              onLoadOlder={controller.remarks.loadOlder}
              onRetry={controller.remarks.retry}
              remarkActions={remarkActions}
              olderLabel="Show older remarks"
            />
          ) : (
            <RowActivityFeed
              items={activeFeed.items}
              loading={activeFeed.loading}
              error={activeFeed.error}
              hasMore={activeFeed.hasMore}
              emptyMessage={
                controller.selectedTab === 'history'
                  ? 'No history has been recorded yet.'
                  : 'No activity has been recorded yet.'
              }
              currentUser={currentUser}
              onLoadOlder={activeFeed.loadOlder}
              onRetry={activeFeed.retry}
              remarkActions={remarkActions}
              olderLabel="Show older activity"
            />
          )}
        </div>
      </div>
    </aside>
  );
}

export default memo(RemarksPanel);
