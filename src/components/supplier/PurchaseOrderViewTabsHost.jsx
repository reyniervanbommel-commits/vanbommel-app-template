import React, { useCallback, useEffect, useState } from 'react';
import {
  PurchaseOrderCreateTabsDialog,
  PurchaseOrderNewTabDialog,
  PurchaseOrderViewTabBar,
} from './viewTabs';

export default function PurchaseOrderViewTabsHost({
  activeViewId,
  viewTabs,
  columns = [],
  canManage,
  promptCreateTabs = false,
  onPromptCreateTabsHandled,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (promptCreateTabs && activeViewId) {
      setCreateOpen(true);
      onPromptCreateTabsHandled?.();
    }
  }, [promptCreateTabs, activeViewId, onPromptCreateTabsHandled]);

  const handleCreate = useCallback(async ({ columnKey, color }) => {
    viewTabs.addTabsFromColumn({ columnKey, color });
  }, [viewTabs]);

  const handleNew = useCallback((name) => {
    viewTabs.addBlankTab(name);
  }, [viewTabs]);

  const openNewTab = useCallback(() => setNewOpen(true), []);
  const openCreateTabs = useCallback(() => setCreateOpen(true), []);

  if (!activeViewId) return null;

  return (
    <>
      <PurchaseOrderViewTabBar
        activeTabId={viewTabs.activeTabId}
        extraTabs={viewTabs.extraTabs}
        groups={viewTabs.groups}
        canManage={canManage}
        onSelectTab={viewTabs.selectTab}
        onRemoveTab={viewTabs.removeTab}
        onNewTab={openNewTab}
        onCreateFromColumn={openCreateTabs}
        onSetGroupColor={viewTabs.setGroupColor}
      />
      <PurchaseOrderCreateTabsDialog
        open={createOpen}
        columns={columns}
        groups={viewTabs.groups}
        uniqueValueCount={viewTabs.uniqueValueCount}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <PurchaseOrderNewTabDialog open={newOpen} onOpenChange={setNewOpen} onSubmit={handleNew} />
    </>
  );
}
