import { useCallback, useMemo, useState } from 'react';

export function useColumnReorderDrag({ onReorder, disabled = false }) {
  const [draggingKey, setDraggingKey] = useState('');
  const [dropTarget, setDropTarget] = useState({ key: '', position: 'before' });
  const canDrag = !disabled && typeof onReorder === 'function';

  const resetDropTarget = useCallback(() => {
    setDropTarget((prev) => (prev.key ? { key: '', position: 'before' } : prev));
  }, []);

  const handleDragStart = useCallback((event, columnKey) => {
    if (!canDrag) return;
    setDraggingKey(columnKey);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnKey);
  }, [canDrag]);

  const handleDragOver = useCallback((event, columnKey) => {
    if (!canDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) > (rect.width / 2) ? 'after' : 'before';
    setDropTarget((prev) => (prev.key === columnKey && prev.position === position ? prev : { key: columnKey, position }));
  }, [canDrag]);

  const handleDragLeave = useCallback((event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    resetDropTarget();
  }, [resetDropTarget]);

  const handleDrop = useCallback(async (event, columnKey) => {
    if (!canDrag) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) > (rect.width / 2) ? 'after' : 'before';
    const sourceKey = String(event.dataTransfer.getData('text/plain') || '');
    resetDropTarget();
    if (!sourceKey || sourceKey === columnKey) return;
    await onReorder(sourceKey, columnKey, position);
  }, [canDrag, onReorder, resetDropTarget]);

  const handleDragEnd = useCallback(() => {
    setDraggingKey('');
    resetDropTarget();
  }, [resetDropTarget]);

  const getCellDragProps = useCallback((columnKey) => {
    if (!canDrag) return {};
    return {
      draggable: true,
      onDragStart: (event) => handleDragStart(event, columnKey),
      onDragOver: (event) => handleDragOver(event, columnKey),
      onDragLeave: handleDragLeave,
      onDrop: (event) => handleDrop(event, columnKey),
      onDragEnd: handleDragEnd,
    };
  }, [canDrag, handleDragEnd, handleDragLeave, handleDragOver, handleDragStart, handleDrop]);

  return useMemo(() => ({
    canDrag,
    draggingKey,
    dropTargetKey: dropTarget.key,
    dropTargetPosition: dropTarget.position,
    getCellDragProps,
  }), [canDrag, draggingKey, dropTarget, getCellDragProps]);
}
