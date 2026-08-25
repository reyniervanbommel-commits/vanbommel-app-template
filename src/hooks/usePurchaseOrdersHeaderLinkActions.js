import { useCallback } from 'react';

export function usePurchaseOrdersHeaderLinkActions({
  lineTotalHeaderLinks,
  lineValueHeaderLinks,
  visibleHeaderColumns,
  lineTotalColumns,
  addHeaderColumnAfter,
  addLineTotalHeaderLink,
  addLineValueHeaderLink,
  setLineColumnTotal,
  setEditingColumnKey,
  reload,
}) {
  const handlePushLineTotalToHeader = useCallback(async (lineColumn) => {
    const lineColumnKey = String(lineColumn?.key || '').trim();
    if (!lineColumnKey) return;
    const activeLink = lineTotalHeaderLinks.find((link) => link.lineColumnKey === lineColumnKey);
    if (activeLink?.headerColumnKey) {
      setEditingColumnKey(activeLink.headerColumnKey);
      return;
    }
    const sameKeyHeader = visibleHeaderColumns.find((column) => column.key === lineColumnKey);
    const fallbackHeader = visibleHeaderColumns[visibleHeaderColumns.length - 1];
    const afterKey = sameKeyHeader?.key || fallbackHeader?.key || '';
    const created = await addHeaderColumnAfter(afterKey, {
      label: `${lineColumn.label} Total`,
      dataType: 'number',
    });
    if (!created?.key) return;
    await addLineTotalHeaderLink({ lineColumnKey, headerColumnKey: created.key });
    if (!lineTotalColumns.includes(lineColumnKey)) {
      await setLineColumnTotal(lineColumnKey, true);
    }
    if (typeof reload === 'function') await reload();
    setEditingColumnKey(created.key);
  }, [
    lineTotalHeaderLinks,
    visibleHeaderColumns,
    addHeaderColumnAfter,
    addLineTotalHeaderLink,
    lineTotalColumns,
    setLineColumnTotal,
    setEditingColumnKey,
    reload,
  ]);

  const handlePushLineValuesToHeader = useCallback(async (lineColumn) => {
    const lineColumnKey = String(lineColumn?.key || '').trim();
    if (!lineColumnKey) return;
    const activeLink = lineValueHeaderLinks.find((link) => link.lineColumnKey === lineColumnKey);
    if (activeLink?.headerColumnKey) {
      setEditingColumnKey(activeLink.headerColumnKey);
      return;
    }
    const fallbackHeader = visibleHeaderColumns[visibleHeaderColumns.length - 1];
    const created = await addHeaderColumnAfter(fallbackHeader?.key || '', {
      label: `${lineColumn.label} Values`,
      dataType: 'text',
    });
    if (!created?.key) return;
    await addLineValueHeaderLink({ lineColumnKey, headerColumnKey: created.key });
    if (typeof reload === 'function') await reload();
    setEditingColumnKey(created.key);
  }, [
    lineValueHeaderLinks,
    visibleHeaderColumns,
    addHeaderColumnAfter,
    addLineValueHeaderLink,
    setEditingColumnKey,
    reload,
  ]);

  return {
    handlePushLineTotalToHeader,
    handlePushLineValuesToHeader,
  };
}
