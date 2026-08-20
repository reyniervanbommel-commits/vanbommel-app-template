import React from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  FilterRegular,
  TableRegular,
} from '@fluentui/react-icons';

/**
 * Submenu-item voor het view-menu: Excel-download van alle orders of
 * alleen de rijen die de huidige view/filter toont.
 *
 * @param {object} props
 * @param {(scope: 'all' | 'view') => void} props.onExportExcel
 */
export default function PurchaseOrderExportMenu({ onExportExcel }) {
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<ArrowDownloadRegular />}>Download to Excel</MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem icon={<TableRegular />} onClick={() => onExportExcel('all')}>
            All orders
          </MenuItem>
          <MenuItem icon={<FilterRegular />} onClick={() => onExportExcel('view')}>
            Current view (filters applied)
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
