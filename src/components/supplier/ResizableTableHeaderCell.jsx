import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;

const useStyles = makeStyles({
  cell: {},
  content: {
    minWidth: 0,
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    right: '-4px',
    top: 0,
    bottom: 0,
    width: '8px',
    cursor: 'col-resize',
    touchAction: 'none',
    zIndex: 4,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2,
    },
  },
  resizeHandleDragging: {
    backgroundColor: tokens.colorBrandBackground2,
  },
});

function clampWidth(rawWidth, minWidth, maxWidth) {
  const parsed = Number(rawWidth);
  if (!Number.isFinite(parsed)) return minWidth;
  return Math.min(maxWidth, Math.max(minWidth, Math.round(parsed)));
}

function combineClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export default function ResizableTableHeaderCell({
  columnKey,
  width,
  className,
  minWidth = MIN_COLUMN_WIDTH,
  maxWidth = MAX_COLUMN_WIDTH,
  onResizeEnd,
  cellStyle,
  children,
  ...cellProps
}) {
  const styles = useStyles();
  const cellRef = useRef(null);
  const cleanupRef = useRef(null);
  const latestWidthRef = useRef(null);
  const frameRef = useRef(null);
  const pendingWidthRef = useRef(null);
  const [dragWidth, setDragWidth] = useState(null);
  const [dragging, setDragging] = useState(false);

  const resolvedWidth = useMemo(() => {
    if (Number.isFinite(dragWidth)) {
      return clampWidth(dragWidth, minWidth, maxWidth);
    }
    if (Number.isFinite(Number(width))) {
      return clampWidth(width, minWidth, maxWidth);
    }
    return null;
  }, [dragWidth, width, minWidth, maxWidth]);

  const finishDrag = useCallback((shouldPersist = true) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingWidthRef.current = null;
    setDragging(false);
    setDragWidth(null);
    if (!shouldPersist || typeof onResizeEnd !== 'function') return;
    const nextWidth = latestWidthRef.current;
    if (!Number.isFinite(nextWidth)) return;
    onResizeEnd(columnKey, clampWidth(nextWidth, minWidth, maxWidth));
  }, [columnKey, minWidth, maxWidth, onResizeEnd]);

  const applyDragWidth = useCallback((nextWidth) => {
    latestWidthRef.current = nextWidth;
    setDragWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  const handleResizeMouseDown = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (cleanupRef.current) cleanupRef.current();

    const cellRect = cellRef.current?.getBoundingClientRect();
    const startWidth = clampWidth(
      cellRect?.width || width || minWidth,
      minWidth,
      maxWidth
    );
    const startX = event.clientX;
    applyDragWidth(startWidth);
    setDragging(true);

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const flushPendingWidth = () => {
      const pendingWidth = pendingWidthRef.current;
      pendingWidthRef.current = null;
      if (!Number.isFinite(pendingWidth)) return;
      applyDragWidth(pendingWidth);
    };

    const schedulePreviewWidth = (nextWidth) => {
      pendingWidthRef.current = nextWidth;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        flushPendingWidth();
      });
    };

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = clampWidth(startWidth + deltaX, minWidth, maxWidth);
      if (nextWidth === latestWidthRef.current && !Number.isFinite(pendingWidthRef.current)) return;
      schedulePreviewWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      flushPendingWidth();
      finishDrag(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    cleanupRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      pendingWidthRef.current = null;
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [applyDragWidth, finishDrag, maxWidth, minWidth, width]);

  useEffect(() => () => finishDrag(false), [finishDrag]);

  return (
    <th
      ref={cellRef}
      className={combineClassNames(styles.cell, className)}
      style={resolvedWidth
        ? { ...(cellStyle || {}), width: `${resolvedWidth}px`, minWidth: `${minWidth}px`, maxWidth: `${resolvedWidth}px` }
        : { ...(cellStyle || {}), minWidth: `${minWidth}px` }}
      {...cellProps}
    >
      <div className={styles.content}>
        {children}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${columnKey} column`}
          className={combineClassNames(styles.resizeHandle, dragging ? styles.resizeHandleDragging : '')}
          onMouseDown={handleResizeMouseDown}
        />
      </div>
    </th>
  );
}
