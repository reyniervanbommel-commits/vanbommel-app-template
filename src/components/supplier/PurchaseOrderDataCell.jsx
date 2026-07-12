import React, { memo, useCallback } from 'react';
import {
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  tokens,
} from '@fluentui/react-components';
import { isColumnFilterActive } from './purchaseOrderColumnFilterMenuConstants';
import {
  copyCellValueToClipboard,
  isCellContextMenuDisabled,
} from '../../utils/tableViewFilterUtils';

function PurchaseOrderDataCell({
  column,
  rawValue,
  className,
  style,
  children,
  filterByColumn,
  onApplyFilterFromCellValue,
  onClearColumnFilter,
  linkedLineTotalKeys = {},
  linkedLineValueKeys = {},
}) {
  const disabled = isCellContextMenuDisabled(column, { linkedLineTotalKeys, linkedLineValueKeys });
  const activeFilter = filterByColumn?.[column.key];
  const filterActive = isColumnFilterActive(column, activeFilter);
  const stickyLeft = Number(column?.stickyLeft);
  const stickyStyle = Number.isFinite(stickyLeft)
    ? {
      position: 'sticky',
      left: `${stickyLeft}px`,
      zIndex: 2,
      backgroundColor: tokens.colorNeutralBackground1,
    }
    : null;
  const resolvedCellStyle = stickyStyle ? { ...style, ...stickyStyle } : style;

  const handleFilterCell = useCallback(() => {
    onApplyFilterFromCellValue?.(column.key, rawValue);
  }, [column.key, onApplyFilterFromCellValue, rawValue]);

  const handleClearFilter = useCallback(() => {
    onClearColumnFilter?.(column.key);
  }, [column.key, onClearColumnFilter]);

  const handleCopyValue = useCallback(() => {
    copyCellValueToClipboard(column, rawValue).catch(() => {});
  }, [column, rawValue]);

  if (disabled) {
    return (
      <td className={className} style={resolvedCellStyle}>
        {children}
      </td>
    );
  }

  return (
    <Menu openOnContext>
      <MenuTrigger disableButtonEnhancement>
        <td className={className} style={resolvedCellStyle}>
          {children}
        </td>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={handleFilterCell}>Filter column on this cell</MenuItem>
          {filterActive ? (
            <MenuItem onClick={handleClearFilter}>Clear column filter</MenuItem>
          ) : null}
          <MenuDivider />
          <MenuItem onClick={handleCopyValue}>Copy cell value</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

export default memo(PurchaseOrderDataCell);
