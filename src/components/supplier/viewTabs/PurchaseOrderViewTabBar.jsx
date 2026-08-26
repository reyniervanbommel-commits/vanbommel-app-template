import React, { useCallback, useState } from 'react';
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
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular, MoreHorizontalRegular } from '@fluentui/react-icons';
import PurchaseOrderViewTabContextMenu from './PurchaseOrderViewTabContextMenu';
import { ALL_TAB_ID, groupColorForTab } from '../../../utils/viewTabs';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    ...shorthands.gap(tokens.spacingHorizontalS),
    minWidth: 0,
    flex: 1,
  },
  scroller: {
    display: 'flex',
    alignItems: 'flex-end',
    minWidth: 0,
    flex: 1,
    overflowX: 'auto',
  },
  tab: {
    maxWidth: '180px',
    minHeight: '28px',
    ...shorthands.margin('0', '4px', '0', '0'),
  },
  allInner: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXXS),
  },
  allChevron: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.padding('0'),
    ...shorthands.border('0'),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    lineHeight: '1',
    fontSize: '12px',
  },
  colorBar: {
    height: '3px',
    width: '100%',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginTop: '2px',
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
    flexShrink: 0,
  },
});

export default function PurchaseOrderViewTabBar({
  activeTabId,
  extraTabs,
  groups,
  columns = [],
  canManage,
  onSelectTab,
  onRemoveTab,
  onNewTab,
  onCreateFromColumn,
  onSetGroupColor,
}) {
  const styles = useStyles();
  const [context, setContext] = useState({ open: false, x: 0, y: 0, tabId: ALL_TAB_ID });

  const handleSelect = useCallback((_, data) => {
    onSelectTab(data.value);
  }, [onSelectTab]);

  const handleOverflowClick = useCallback((event) => {
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (tabId) onSelectTab(tabId);
  }, [onSelectTab]);

  const openMenuAt = useCallback((event, tabId) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect?.();
    setContext({
      open: true,
      x: rect ? rect.left : event.clientX,
      y: rect ? rect.bottom : event.clientY,
      tabId: tabId || ALL_TAB_ID,
    });
  }, []);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const tabId = event.currentTarget.getAttribute('data-tab-id') || ALL_TAB_ID;
    setContext({ open: true, x: event.clientX, y: event.clientY, tabId });
  }, []);

  const handleAllMenuClick = useCallback((event) => {
    openMenuAt(event, ALL_TAB_ID);
  }, [openMenuAt]);

  const handleAllMenuKeyDown = useCallback((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    openMenuAt(event, ALL_TAB_ID);
  }, [openMenuAt]);

  const handleContextOpenChange = useCallback((open) => {
    setContext((prev) => ({ ...prev, open }));
  }, []);

  if (!canManage && extraTabs.length === 0) return null;

  return (
    <div className={styles.row}>
      <div className={styles.scroller}>
        <TabList appearance="subtle" selectedValue={activeTabId} onTabSelect={handleSelect} size="small">
          <Tab
            className={styles.tab}
            value={ALL_TAB_ID}
            data-tab-id={ALL_TAB_ID}
            onContextMenu={handleContextMenu}
          >
            <span className={styles.allInner}>
              All
              {canManage ? (
                <span
                  role="button"
                  tabIndex={0}
                  className={styles.allChevron}
                  aria-label="Tab menu"
                  onMouseDown={handleAllMenuClick}
                  onClick={handleAllMenuClick}
                  onKeyDown={handleAllMenuKeyDown}
                >
                  <ChevronDownRegular />
                </span>
              ) : null}
            </span>
          </Tab>
          {extraTabs.map((tab) => {
            const color = groupColorForTab(tab, groups);
            return (
              <Tab
                key={tab.id}
                className={styles.tab}
                value={tab.id}
                title={tab.name}
                data-tab-id={tab.id}
                onContextMenu={handleContextMenu}
              >
                <span className={styles.tabInner}>
                  <span className={styles.tabLabel}>{tab.name}</span>
                  {color ? <span className={styles.colorBar} style={{ backgroundColor: color }} /> : null}
                </span>
              </Tab>
            );
          })}
        </TabList>
      </div>
      {extraTabs.length > 4 ? (
        <div className={styles.actions}>
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
        </div>
      ) : null}
      <PurchaseOrderViewTabContextMenu
        open={context.open}
        x={context.x}
        y={context.y}
        tabId={context.tabId}
        extraTabs={extraTabs}
        groups={groups}
        columns={columns}
        canManage={canManage}
        onOpenChange={handleContextOpenChange}
        onNewTab={onNewTab}
        onCreateFromColumn={onCreateFromColumn}
        onRemoveTab={onRemoveTab}
        onSetGroupColor={onSetGroupColor}
      />
    </div>
  );
}
