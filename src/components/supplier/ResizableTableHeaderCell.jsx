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
  children,
  ...cellProps
}) {
  const styles = useStyles();
  const cellRef = useRef(null);
  const cleanupRef = useRef(null);
  const latestWidthRef = useRef(null);
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
    setDragging(false);
    setDragWidth(null);
    if (!shouldPersist || typeof onResizeEnd !== 'function') return;
    const nextWidth = latestWidthRef.current;
    if (!Number.isFinite(nextWidth)) return;
    onResizeEnd(columnKey, clampWidth(nextWidth, minWidth, maxWidth));
  }, [columnKey, minWidth, maxWidth, onResizeEnd]);

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
    latestWidthRef.current = startWidth;
    setDragWidth(startWidth);
    setDragging(true);

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = clampWidth(startWidth + deltaX, minWidth, maxWidth);
      latestWidthRef.current = nextWidth;
      setDragWidth(nextWidth);
    };

    const handleMouseUp = () => {
      finishDrag(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    cleanupRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [finishDrag, maxWidth, minWidth, width]);

  useEffect(() => () => finishDrag(false), [finishDrag]);

  return (
    <th
      ref={cellRef}
      className={combineClassNames(styles.cell, className)}
      style={resolvedWidth ? { width: `${resolvedWidth}px`, minWidth: `${minWidth}px`, maxWidth: `${resolvedWidth}px` } : { minWidth: `${minWidth}px` }}
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
