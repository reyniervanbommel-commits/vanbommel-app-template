import React, { useCallback, useEffect, useState } from 'react';
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
import ColorPalettePicker from '../../shared/ColorPalettePicker';
import PurchaseOrderCreateTabsDialog from './PurchaseOrderCreateTabsDialog';
import PurchaseOrderNewTabDialog from './PurchaseOrderNewTabDialog';

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
        <MenuItem>Group color: {label}</MenuItem>
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
  uniqueValueCount,
  promptCreateTabs = false,
  onPromptCreateTabsHandled,
  onAddBlankTab,
  onAddFromColumn,
  onSetGroupColor,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (promptCreateTabs && enabled) {
      setCreateOpen(true);
      onPromptCreateTabsHandled?.();
    }
  }, [promptCreateTabs, enabled, onPromptCreateTabsHandled]);

  const handleNew = useCallback((name) => {
    onAddBlankTab?.(name);
  }, [onAddBlankTab]);

  const handleCreate = useCallback(async (payload) => {
    onAddFromColumn?.(payload);
  }, [onAddFromColumn]);

  const openNewTab = useCallback(() => setNewOpen(true), []);
  const openCreateTabs = useCallback(() => setCreateOpen(true), []);

  if (!enabled) return null;

  return (
    <>
      <MenuDivider />
      <MenuGroup>
        <MenuGroupHeader>Tabs</MenuGroupHeader>
        <MenuItem onClick={openNewTab}>+ Tab</MenuItem>
        <MenuItem onClick={openCreateTabs}>+ Tab from column…</MenuItem>
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
      <PurchaseOrderCreateTabsDialog
        open={createOpen}
        columns={columns}
        groups={groups}
        uniqueValueCount={uniqueValueCount}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <PurchaseOrderNewTabDialog open={newOpen} onOpenChange={setNewOpen} onSubmit={handleNew} />
    </>
  );
}
