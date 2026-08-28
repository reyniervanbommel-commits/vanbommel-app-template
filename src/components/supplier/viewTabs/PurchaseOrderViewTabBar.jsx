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
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import PurchaseOrderViewTabContextMenu from './PurchaseOrderViewTabContextMenu';
import PurchaseOrderViewTabHoverCard from './PurchaseOrderViewTabHoverCard';
import PurchaseOrderViewTabCaption from './PurchaseOrderViewTabCaption';
import { ALL_TAB_ID, groupColorForTab, hasExtraViewTabs } from '../../../utils/viewTabs';

const ALL_HOVER_TAB = { id: ALL_TAB_ID, name: 'All', extraFilters: {} };

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
    paddingTop: tokens.spacingVerticalXS,
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStrokeAccessible} transparent`,
    '::-webkit-scrollbar': {
      height: '5px',
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStrokeAccessible,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    '::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '::-webkit-scrollbar-button': {
      display: 'none',
      width: 0,
      height: 0,
    },
  },
  tab: {
    position: 'relative',
    maxWidth: '12ch',
    minHeight: '28px',
    overflow: 'visible',
    ...shorthands.margin('0', '4px', '0', '0'),
    '::after': {
      display: 'none',
    },
  },
  tabActive: {
    backgroundColor: tokens.colorNeutralBackground4,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
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
  unsavedExtraTabIds = [],
  onSelectTab,
  onRemoveTab,
  onSetGroupColor,
}) {
  const styles = useStyles();
  const [context, setContext] = useState({ open: false, x: 0, y: 0, tabId: '' });
  const [hover, setHover] = useState(null);

  const handleSelect = useCallback((_, data) => {
    onSelectTab(data.value);
  }, [onSelectTab]);

  const handleOverflowClick = useCallback((event) => {
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (tabId) onSelectTab(tabId);
  }, [onSelectTab]);

  const handleTabEnter = useCallback((event) => {
    const tabId = event.currentTarget.getAttribute('data-tab-id') || ALL_TAB_ID;
    const tab = tabId === ALL_TAB_ID
      ? ALL_HOVER_TAB
      : extraTabs.find((entry) => entry.id === tabId);
    if (!tab) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHover({ tab, rect: { left: rect.left, top: rect.bottom } });
  }, [extraTabs]);

  const handleTabLeave = useCallback(() => {
    setHover(null);
  }, []);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (!tabId || tabId === ALL_TAB_ID) return;
    setHover(null);
    setContext({ open: true, x: event.clientX, y: event.clientY, tabId });
  }, []);

  const handleContextOpenChange = useCallback((open) => {
    setContext((prev) => ({ ...prev, open }));
  }, []);

  if (!hasExtraViewTabs(extraTabs)) return null;

  return (
    <div className={styles.row}>
      <div className={styles.scroller}>
        <TabList appearance="subtle" selectedValue={activeTabId} onTabSelect={handleSelect} size="small" reserveSelectedTabSpace={false}>
          <Tab
            className={mergeClasses(styles.tab, activeTabId === ALL_TAB_ID && styles.tabActive)}
            value={ALL_TAB_ID}
            data-tab-id={ALL_TAB_ID}
            onMouseEnter={handleTabEnter}
            onMouseLeave={handleTabLeave}
          >
            <PurchaseOrderViewTabCaption
              label="All"
              isActive={activeTabId === ALL_TAB_ID}
            />
          </Tab>
          {extraTabs.map((tab) => {
            const color = groupColorForTab(tab, groups);
            const isActive = activeTabId === tab.id;
            const hasUnsharedExtra = unsavedExtraTabIds.includes(tab.id);
            return (
              <Tab
                key={tab.id}
                className={mergeClasses(styles.tab, isActive && styles.tabActive)}
                value={tab.id}
                data-tab-id={tab.id}
                title={hasUnsharedExtra ? 'This tab has an extra filter not used on other tabs in the group' : undefined}
                onContextMenu={handleContextMenu}
                onMouseEnter={handleTabEnter}
                onMouseLeave={handleTabLeave}
              >
                <PurchaseOrderViewTabCaption
                  label={tab.name}
                  color={color}
                  isActive={isActive}
                  hasUnsharedExtra={hasUnsharedExtra}
                />
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
      <PurchaseOrderViewTabHoverCard tab={hover?.tab} columns={columns} anchorRect={hover?.rect} />
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
        onRemoveTab={onRemoveTab}
        onSetGroupColor={onSetGroupColor}
      />
    </div>
  );
}
