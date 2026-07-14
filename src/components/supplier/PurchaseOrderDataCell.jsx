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
  const { column, rawValue } = cell;
  const { className, style } = layout;
  const disabled = isCellContextMenuDisabled(column);
  const activeFilter = contextMenu?.filterByColumn?.[column.key];
  const filterActive = isColumnFilterActive(column, activeFilter);
  const stickyLeft = Number(column?.stickyLeft);
  const resolvedCellStyle = useMemo(() => ({
    ...style,
    position: Number.isFinite(stickyLeft) ? 'sticky' : 'relative',
    ...(Number.isFinite(stickyLeft) ? {
      left: `${stickyLeft}px`,
      zIndex: 2,
      backgroundColor: tokens.colorNeutralBackground1,
    } : {}),
  }), [stickyLeft, style]);

  const handleContextMenu = useCallback((event) => {
    if (disabled) return;
    event.preventDefault();
    contextMenu?.open?.(event.currentTarget, {
      column,
      rawValue,
      filterActive,
    });
  }, [column, contextMenu, disabled, filterActive, rawValue]);

  return (
    <td
      className={className}
      style={resolvedCellStyle}
      onContextMenu={handleContextMenu}
    >
      {children}
    </td>
  );
}

export default memo(PurchaseOrderDataCell);
