import React, { memo } from 'react';
import {
  Button,
  Checkbox,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  TextBulletList20Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  controlHeaderCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 4,
    width: '58px',
    minWidth: '58px',
    maxWidth: '58px',
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
});

function PurchaseOrdersTableControls({
  onSetExpansion,
  selectionEnabled = false,
  allSelected = false,
  someSelected = false,
  onToggleAll,
}) {
  const styles = useStyles();

  return (
    <th className={styles.controlHeaderCell} aria-label="Table display controls">
      <div className={styles.toolbar}>
        {selectionEnabled ? (
          <Checkbox
            className={styles.selectAll}
            checked={allSelected ? true : (someSelected ? 'mixed' : false)}
            onChange={onToggleAll}
            aria-label="Selecteer alle rijen"
            title="Selecteer alle rijen"
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
                    <MenuItem onClick={() => onSetExpansion('all', true)}>All</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('boards', true)}>Groups</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('groups', true)}>Subitems</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <MenuItem>Collapse</MenuItem>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={() => onSetExpansion('all', false)}>All</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('boards', false)}>Groups</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('groups', false)}>Subitems</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </th>
  );
}

export default memo(PurchaseOrdersTableControls);
