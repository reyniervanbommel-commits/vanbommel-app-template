import React, { useCallback, useMemo } from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../../shared/ColorPalettePicker';
import { ALL_TAB_ID, groupColorForTab, inferGroupColumnKey } from '../../../utils/viewTabs';

const useStyles = makeStyles({
  anchor: {
    position: 'fixed',
    width: '1px',
    height: '1px',
    pointerEvents: 'none',
  },
  colorWrap: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
});

export default function PurchaseOrderViewTabContextMenu({
  open,
  x,
  y,
  tabId,
  extraTabs,
  groups,
  canManage,
  onOpenChange,
  onNewTab,
  onCreateFromColumn,
  onRemoveTab,
  onSetGroupColor,
}) {
  const styles = useStyles();
  const isAll = tabId === ALL_TAB_ID;
  const tab = useMemo(
    () => extraTabs.find((entry) => entry.id === tabId) || null,
    [extraTabs, tabId]
  );
  const groupKey = tab ? inferGroupColumnKey(tab) : (groups[0]?.columnKey || '');
  const selectedColor = tab
    ? groupColorForTab(tab, groups)
    : (groups[0]?.color || '#579bfc');

  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(Boolean(data.open));
  }, [onOpenChange]);

  const handleNewTab = useCallback(() => {
    onNewTab();
    onOpenChange(false);
  }, [onNewTab, onOpenChange]);

  const handleFromColumn = useCallback(() => {
    onCreateFromColumn();
    onOpenChange(false);
  }, [onCreateFromColumn, onOpenChange]);

  const handleDelete = useCallback(() => {
    if (tabId && tabId !== ALL_TAB_ID) onRemoveTab(tabId);
    onOpenChange(false);
  }, [onRemoveTab, onOpenChange, tabId]);

  const handleColor = useCallback((color) => {
    if (groupKey) onSetGroupColor(groupKey, color);
  }, [groupKey, onSetGroupColor]);

  const stopMenuClose = useCallback((event) => {
    event.stopPropagation();
  }, []);

  if (!canManage) return null;

  return (
    <Menu open={open} onOpenChange={handleOpenChange}>
      <MenuTrigger disableButtonEnhancement>
        <span className={styles.anchor} style={{ left: `${x}px`, top: `${y}px` }} />
      </MenuTrigger>
      <MenuPopover>
        {isAll ? (
          <MenuList>
            <MenuItem icon={<AddRegular />} onClick={handleNewTab}>+ Tab</MenuItem>
            <MenuItem onClick={handleFromColumn}>From column…</MenuItem>
            {groups.length ? (
              <div className={styles.colorWrap} onMouseDown={stopMenuClose} onClick={stopMenuClose}>
                <Text size={200}>Group color</Text>
                <ColorPalettePicker
                  selectedColor={selectedColor || '#579bfc'}
                  onSelect={handleColor}
                  layout="grid"
                  ariaLabel="Group color"
                />
              </div>
            ) : null}
          </MenuList>
        ) : (
          <MenuList>
            <MenuItem icon={<DeleteRegular />} onClick={handleDelete}>Delete tab</MenuItem>
          </MenuList>
        )}
      </MenuPopover>
    </Menu>
  );
}
