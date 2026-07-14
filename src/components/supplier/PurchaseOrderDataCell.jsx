import React, { memo, useCallback, useMemo } from 'react';
import { tokens } from '@fluentui/react-components';
import { isColumnFilterActive } from './purchaseOrderColumnFilterMenuConstants';
import { isCellContextMenuDisabled } from '../../utils/tableViewFilterUtils';
import TrackChangeMarks from './TrackChangeMarks';
import { useTrackChangesMeta } from './trackChangesContext';

function PurchaseOrderDataCell({
  cell,
  layout,
  contextMenu,
  children,
}) {
  const { column, rawValue, order } = cell;
  const { className, contentClassName, contentStyle, style } = layout;
  const trackMeta = useTrackChangesMeta();
  const trackPattern = useMemo(() => {
    if (!trackMeta) return null;
    const colId = column?.id;
    if (colId == null) return null;
    const active = Object.prototype.hasOwnProperty.call(trackMeta.activeOffsetByColumnId || {}, String(colId));
    if (!active) return null;
    return order?.trackMarksByColumnId?.[colId] ?? trackMeta.defaultPattern?.[colId] ?? null;
  }, [trackMeta, column?.id, order]);
  const disabled = isCellContextMenuDisabled(column);
  const activeFilter = contextMenu?.filterByColumn?.[column.key];
  const filterActive = isColumnFilterActive(column, activeFilter);
  const stickyLeft = Number(column?.stickyLeft);
  const isLocated = Boolean(layout?.isLocated);
  const resolvedCellStyle = useMemo(() => {
    const isSticky = Number.isFinite(stickyLeft);
    const hasBackground = Boolean(style?.backgroundColor);
    return {
      ...style,
      position: isSticky ? 'sticky' : 'relative',
      ...(isSticky ? {
        left: `${stickyLeft}px`,
        zIndex: isLocated ? 4 : 2,
        ...(hasBackground ? {} : { backgroundColor: tokens.colorNeutralBackground1 }),
      } : {}),
    };
  }, [isLocated, stickyLeft, style]);

  const handleContextMenu = useCallback((event) => {
    if (disabled) return;
    event.preventDefault();
    contextMenu?.open?.(event.currentTarget, {
      column,
      rawValue,
      filterActive,
      order,
    });
  }, [column, contextMenu, disabled, filterActive, order, rawValue]);

  return (
    <td
      className={className}
      style={resolvedCellStyle}
      onContextMenu={handleContextMenu}
    >
      <div className={contentClassName || undefined} style={contentStyle}>{children}</div>
      {trackPattern ? <TrackChangeMarks pattern={trackPattern} mode={trackMeta?.mode} /> : null}
    </td>
  );
}

export default memo(PurchaseOrderDataCell);
