import React, { memo, useCallback } from 'react';
import {
  Button,
  Checkbox,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  Filter20Regular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';
import { purchaseOrderBoardControlColumnWidth } from './purchaseOrderBoardLayout';

const useStyles = makeStyles({
  controlHeaderCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 4,
    width: purchaseOrderBoardControlColumnWidth,
    minWidth: purchaseOrderBoardControlColumnWidth,
    maxWidth: purchaseOrderBoardControlColumnWidth,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px'),
    textAlign: 'left',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...shorthands.gap('2px'),
  },
  selectAll: {
    ...shorthands.padding('0'),
  },
  button: {
    minWidth: '22px',
    width: '22px',
    height: '22px',
    ...shorthands.padding('0'),
  },
  filterIcon: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    right: '-2px',
    top: '-2px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandForeground1,
  },
});

function PurchaseOrdersTableControls({
  onSetExpansion,
  productImageColumnVisible = true,
  onToggleProductImageColumn,
  selectionEnabled = false,
  allSelected = false,
  someSelected = false,
  onToggleAll,
  hasActive = false,
  onOpenFlyout,
}) {
  const styles = useStyles();
  const expandAll = useCallback(() => onSetExpansion('all', true), [onSetExpansion]);
  const expandGroups = useCallback(() => onSetExpansion('boards', true), [onSetExpansion]);
  const expandSubitems = useCallback(() => onSetExpansion('groups', true), [onSetExpansion]);
  const collapseAll = useCallback(() => onSetExpansion('all', false), [onSetExpansion]);
  const collapseGroups = useCallback(() => onSetExpansion('boards', false), [onSetExpansion]);
  const collapseSubitems = useCallback(() => onSetExpansion('groups', false), [onSetExpansion]);
  const hideProductImageColumn = useCallback(() => {
    onToggleProductImageColumn?.(false);
  }, [onToggleProductImageColumn]);
  const showProductImageColumn = useCallback(() => {
    onToggleProductImageColumn?.(true);
  }, [onToggleProductImageColumn]);
  const openFlyout = useCallback(() => {
    onOpenFlyout?.();
  }, [onOpenFlyout]);
  const filterButtonLabel = hasActive
    ? 'Show active filters and formatting (active)'
    : 'Show active filters and formatting';
  const filterIcon = (
    <span className={styles.filterIcon}>
      <Filter20Regular />
      {hasActive ? <span className={styles.activeDot} aria-hidden="true" /> : null}
    </span>
  );

  return (
    <th className={styles.controlHeaderCell} aria-label="Table display controls">
      <div className={styles.toolbar}>
        {selectionEnabled ? (
          <Checkbox
            className={styles.selectAll}
            checked={allSelected ? true : (someSelected ? 'mixed' : false)}
            onChange={onToggleAll}
            aria-label="Select all rows"
            title="Select all rows"
          />
        ) : null}
        <Menu positioning="below-start">
          <MenuTrigger disableButtonEnhancement>
            <Button
              size="small"
              appearance="subtle"
              className={styles.button}
              icon={<TextBulletList20Regular />}
              title="Table options"
              aria-label="Table options"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <MenuItem>Expand</MenuItem>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={expandAll}>All</MenuItem>
                    <MenuItem onClick={expandGroups}>Groups</MenuItem>
                    <MenuItem onClick={expandSubitems}>Subitems</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <MenuItem>Collapse</MenuItem>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={collapseAll}>All</MenuItem>
                    <MenuItem onClick={collapseGroups}>Groups</MenuItem>
                    <MenuItem onClick={collapseSubitems}>Subitems</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              {typeof onToggleProductImageColumn === 'function' ? (
                <>
                  <MenuDivider />
                  {productImageColumnVisible ? (
                    <MenuItem onClick={hideProductImageColumn}>Hide image column</MenuItem>
                  ) : (
                    <MenuItem onClick={showProductImageColumn}>Show image column</MenuItem>
                  )}
                </>
              ) : null}
            </MenuList>
          </MenuPopover>
        </Menu>
        {typeof onOpenFlyout === 'function' ? (
          <Button
            size="small"
            appearance="subtle"
            className={styles.button}
            icon={filterIcon}
            title={filterButtonLabel}
            aria-label={filterButtonLabel}
            onClick={openFlyout}
          />
        ) : null}
      </div>
    </th>
  );
}

export default memo(PurchaseOrdersTableControls);
