import React, { memo, useCallback } from 'react';
import {
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
} from '@fluentui/react-components';
import { copyCellValueToClipboard } from '../../utils/tableViewFilterUtils';

function PurchaseOrderCellContextMenu({ context, actions }) {
  const close = actions?.close;

  const handleOpenChange = useCallback((_, data) => {
    if (!data.open) close?.();
  }, [close]);

  const handleFilterCell = useCallback(() => {
    actions?.applyFilter?.(context.column.key, context.rawValue);
    close?.();
  }, [actions, close, context]);

  const handleClearFilter = useCallback(() => {
    actions?.clearFilter?.(context.column.key);
    close?.();
  }, [actions, close, context]);

  const handleCopyValue = useCallback(() => {
    copyCellValueToClipboard(context.column, context.rawValue)
      .catch(() => {})
      .finally(() => close?.());
  }, [close, context]);

  const handleOpenRemarks = useCallback(() => {
    actions?.openRemarks?.(context?.order, context?.column, context?.target);
    close?.();
  }, [actions, close, context]);

  if (!context) return null;
  const showValueActions = !['image', 'remarks'].includes(context.column?.dataType);

  return (
    <Menu
      open
      onOpenChange={handleOpenChange}
      positioning={{ target: context.target }}
    >
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={handleOpenRemarks}>Remarks</MenuItem>
          {showValueActions ? (
            <>
              <MenuDivider />
              <MenuItem onClick={handleFilterCell}>Filter column on this cell</MenuItem>
              {context.filterActive ? (
                <MenuItem onClick={handleClearFilter}>Clear column filter</MenuItem>
              ) : null}
              <MenuDivider />
              <MenuItem onClick={handleCopyValue}>Copy cell value</MenuItem>
            </>
          ) : null}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

export default memo(PurchaseOrderCellContextMenu);
