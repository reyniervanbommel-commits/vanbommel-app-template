import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PurchaseOrderCreateTabsDialog from './PurchaseOrderCreateTabsDialog';
import PurchaseOrderNewTabDialog from './PurchaseOrderNewTabDialog';

const ViewTabsActionsContext = createContext({
  canCreateFromColumn: false,
  openNewTab: () => {},
  openCreateTabs: () => {},
});

export function useViewTabsActions() {
  return useContext(ViewTabsActionsContext);
}

/**
 * Houdt tab-dialogs buiten Fluent Menu/Popover, zodat ze niet unmounten bij sluiten.
 */
export default function ViewTabsDialogsProvider({
  viewTabs,
  columns = [],
  isStaff = false,
  activeViewId,
  children,
}) {
  const enabled = Boolean(activeViewId && isStaff && viewTabs);
  const [newOpen, setNewOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumnKey, setCreateColumnKey] = useState('');
  const [pendingCreate, setPendingCreate] = useState(false);

  const openNewTab = useCallback(() => {
    if (!enabled) return;
    setNewOpen(true);
  }, [enabled]);

  const openCreateTabs = useCallback((columnKey = '') => {
    setCreateColumnKey(columnKey || '');
    if (enabled) setCreateOpen(true);
    else setPendingCreate(true);
  }, [enabled]);

  useEffect(() => {
    if (!pendingCreate || !enabled) return;
    setCreateOpen(true);
    setPendingCreate(false);
  }, [enabled, pendingCreate]);

  const handleNew = useCallback((name) => {
    viewTabs?.addBlankTab?.(name);
  }, [viewTabs]);

  const handleCreate = useCallback((payload) => {
    viewTabs?.addTabsFromColumn?.(payload);
  }, [viewTabs]);

  const value = useMemo(() => ({
    canCreateFromColumn: enabled,
    openNewTab,
    openCreateTabs,
  }), [enabled, openCreateTabs, openNewTab]);

  return (
    <ViewTabsActionsContext.Provider value={value}>
      {children}
      <PurchaseOrderNewTabDialog open={newOpen} onOpenChange={setNewOpen} onSubmit={handleNew} />
      <PurchaseOrderCreateTabsDialog
        open={createOpen}
        initialColumnKey={createColumnKey}
        columns={columns}
        groups={viewTabs?.groups || []}
        uniqueValueCount={viewTabs?.uniqueValueCount}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </ViewTabsActionsContext.Provider>
  );
}
