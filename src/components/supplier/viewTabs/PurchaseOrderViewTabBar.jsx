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
import { ALL_TAB_ID, groupColorForTab, hasExtraViewTabs, tabUnderlineColor } from '../../../utils/viewTabs';

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
    '::after': {
      display: 'none',
    },
  },
  tabActive: {
    backgroundColor: tokens.colorNeutralBackground4,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  colorBar: {
    height: '3px',
    width: '100%',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginTop: '2px',
  },
  colorBarFallback: {
    backgroundColor: tokens.colorBrandStroke1,
  },
  colorBarFallbackMuted: {
    backgroundColor: `color-mix(in srgb, ${tokens.colorBrandStroke1} 25%, transparent)`,
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

function TabColorBar({ color, isActive, styles }) {
  const backgroundColor = tabUnderlineColor(color, isActive);
  return (
    <span
      className={mergeClasses(
        styles.colorBar,
        !backgroundColor && (isActive ? styles.colorBarFallback : styles.colorBarFallbackMuted),
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    />
  );
}

export default function PurchaseOrderViewTabBar({
  activeTabId,
  extraTabs,
  groups,
  columns = [],
  canManage,
  onSelectTab,
  onRemoveTab,
}) {
  const styles = useStyles();
  const [context, setContext] = useState({ open: false, x: 0, y: 0, tabId: '' });

  const handleSelect = useCallback((_, data) => {
    onSelectTab(data.value);
  }, [onSelectTab]);

  const handleOverflowClick = useCallback((event) => {
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (tabId) onSelectTab(tabId);
  }, [onSelectTab]);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const tabId = event.currentTarget.getAttribute('data-tab-id');
    if (!tabId || tabId === ALL_TAB_ID) return;
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
          >
            <span className={styles.tabInner}>
              <span className={styles.tabLabel}>All</span>
              <TabColorBar color="" isActive={activeTabId === ALL_TAB_ID} styles={styles} />
            </span>
          </Tab>
          {extraTabs.map((tab) => {
            const color = groupColorForTab(tab, groups);
            const isActive = activeTabId === tab.id;
            return (
              <Tab
                key={tab.id}
                className={mergeClasses(styles.tab, isActive && styles.tabActive)}
                value={tab.id}
                title={tab.name}
                data-tab-id={tab.id}
                onContextMenu={handleContextMenu}
              >
                <span className={styles.tabInner}>
                  <span className={styles.tabLabel}>{tab.name}</span>
                  <TabColorBar color={color} isActive={isActive} styles={styles} />
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
        onRemoveTab={onRemoveTab}
      />
    </div>
  );
}
