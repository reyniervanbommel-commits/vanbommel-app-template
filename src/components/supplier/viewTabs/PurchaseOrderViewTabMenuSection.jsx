import React, { useCallback } from 'react';
import {
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ColorRegular, TabAddRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../../shared/ColorPalettePicker';
import { useViewTabsActions } from './ViewTabsDialogsProvider';

const useStyles = makeStyles({
  colorWrap: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
  },
});

function GroupColorMenuItem({ columnKey, label, selectedColor, onSetGroupColor }) {
  const styles = useStyles();
  const handleSelect = useCallback((color) => {
    onSetGroupColor(columnKey, color);
  }, [columnKey, onSetGroupColor]);
  const stopMenuClose = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<ColorRegular />}>Group color: {label}</MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <div className={styles.colorWrap} onMouseDown={stopMenuClose} onClick={stopMenuClose}>
          <ColorPalettePicker
            selectedColor={selectedColor || '#579bfc'}
            onSelect={handleSelect}
            layout="grid"
            ariaLabel={`Group color ${label}`}
          />
        </div>
      </MenuPopover>
    </Menu>
  );
}

export default function PurchaseOrderViewTabMenuSection({
  enabled,
  groups = [],
  columns = [],
  onSetGroupColor,
}) {
  const { openNewTab, openCreateTabs } = useViewTabsActions();
  const handleOpenCreateTabs = useCallback(() => openCreateTabs(), [openCreateTabs]);

  if (!enabled) return null;

  return (
    <>
      <MenuDivider />
      <MenuGroup>
        <MenuGroupHeader>Tabs</MenuGroupHeader>
        <MenuItem icon={<TabAddRegular />} onClick={openNewTab}>Tab</MenuItem>
        <MenuItem icon={<TabAddRegular />} onClick={handleOpenCreateTabs}>Tab from column…</MenuItem>
        {groups.map((group) => (
          <GroupColorMenuItem
            key={group.columnKey}
            columnKey={group.columnKey}
            label={columns.find((column) => column.key === group.columnKey)?.label || group.columnKey}
            selectedColor={group.color}
            onSetGroupColor={onSetGroupColor}
          />
        ))}
      </MenuGroup>
    </>
  );
}
