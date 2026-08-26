import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tab,
  TabList,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, DismissRegular, MoreHorizontalRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../../shared/ColorPalettePicker';
import { ALL_TAB_ID, groupColorForTab, inferGroupColumnKey } from '../../../utils/viewTabs';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalS,
    minWidth: 0,
  },
  scroller: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    flex: 1,
    overflowX: 'auto',
  },
  tab: {
    maxWidth: '180px',
  },
  colorBar: {
    height: '3px',
    width: '100%',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginBottom: '2px',
  },
  tabInner: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  tabLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    flexShrink: 0,
  },
});

export default function PurchaseOrderViewTabBar({
  activeTabId,
  extraTabs,
  groups,
  canManage,
  onSelectTab,
  onRemoveTab,
  onNewTab,
  onCreateFromColumn,
  onSetGroupColor,
}) {
  const styles = useStyles();
  const [colorOpen, setColorOpen] = useState(false);
  const selected = useMemo(
    () => extraTabs.find((tab) => tab.id === activeTabId) || null,
    [extraTabs, activeTabId]
  );
  const selectedGroupKey = selected ? inferGroupColumnKey(selected) : '';
  const selectedColor = selected ? groupColorForTab(selected, groups) : '';

  const handleSelect = useCallback((_, data) => {
    onSelectTab(data.value);
  }, [onSelectTab]);

  const handleRemoveSelected = useCallback(() => {
    if (selected) onRemoveTab(selected.id);
  }, [onRemoveTab, selected]);

  const handleOverflowClick = useCallback((event) => {
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (tabId) onSelectTab(tabId);
  }, [onSelectTab]);

  const handleColorMenuOpen = useCallback((_, data) => {
    setColorOpen(Boolean(data.open));
  }, []);

  const handleColor = useCallback((color) => {
    if (selectedGroupKey) onSetGroupColor(selectedGroupKey, color);
  }, [onSetGroupColor, selectedGroupKey]);

  if (!canManage && extraTabs.length === 0) return null;

  return (
    <div className={styles.row}>
      <div className={styles.scroller}>
        <TabList selectedValue={activeTabId} onTabSelect={handleSelect} size="small">
          <Tab className={styles.tab} value={ALL_TAB_ID}>All</Tab>
          {extraTabs.map((tab) => {
            const color = groupColorForTab(tab, groups);
            return (
              <Tab key={tab.id} className={styles.tab} value={tab.id} title={tab.name}>
                <span className={styles.tabInner}>
                  {color ? <span className={styles.colorBar} style={{ backgroundColor: color }} /> : null}
                  <span className={styles.tabLabel}>{tab.name}</span>
                </span>
              </Tab>
            );
          })}
        </TabList>
      </div>
      <div className={styles.actions}>
        {extraTabs.length > 4 ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" size="small" icon={<MoreHorizontalRegular />} aria-label="More tabs" />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem data-tab-id={ALL_TAB_ID} onClick={handleOverflowClick}>All</MenuItem>
                {extraTabs.map((tab) => (
                  <MenuItem key={tab.id} data-tab-id={tab.id} onClick={handleOverflowClick}>{tab.name}</MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : null}
        {canManage ? (
          <>
            <Button appearance="subtle" size="small" icon={<AddRegular />} onClick={onNewTab}>
              New tab
            </Button>
            <Button appearance="subtle" size="small" onClick={onCreateFromColumn}>
              From column…
            </Button>
            {selected ? (
              <Button
                appearance="subtle"
                size="small"
                icon={<DismissRegular />}
                aria-label="Close tab"
                onClick={handleRemoveSelected}
              />
            ) : null}
            {selected && selectedGroupKey ? (
              <Menu open={colorOpen} onOpenChange={handleColorMenuOpen}>
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="subtle" size="small">Group color</Button>
                </MenuTrigger>
                <MenuPopover>
                  <div className={mergeClasses(styles.tabInner)}>
                    <ColorPalettePicker
                      selectedColor={selectedColor || '#579bfc'}
                      onSelect={handleColor}
                      layout="grid"
                      ariaLabel="Group color"
                    />
                  </div>
                </MenuPopover>
              </Menu>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
