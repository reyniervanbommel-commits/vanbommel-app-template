import React, { memo, useCallback, useMemo } from 'react';
import { tokens } from '@fluentui/react-components';
import { isColumnFilterActive } from './purchaseOrderColumnFilterMenuConstants';
import { isCellContextMenuDisabled } from '../../utils/tableViewFilterUtils';

function PurchaseOrderDataCell({
  cell,
  layout,
  contextMenu,
  children,
}) {
  const { column, rawValue, order } = cell;
  const { className, contentClassName, contentStyle, style } = layout;
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
    </td>
  );
}

export default memo(PurchaseOrderDataCell);
