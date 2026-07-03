import React, { memo } from 'react';
import {
  Button,
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
    zIndex: 2,
    width: '34px',
    minWidth: '34px',
    maxWidth: '34px',
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
  },
  button: {
    minWidth: '22px',
    width: '22px',
    height: '22px',
    ...shorthands.padding('0'),
  },
});

function PurchaseOrdersTableControls({
  showBoardHeaders,
  showGroupHeaders,
  onSetExpansion,
  onToggleBoardHeaders,
  onToggleGroupHeaders,
}) {
  const styles = useStyles();

  return (
    <th className={styles.controlHeaderCell} aria-label="Table display controls">
      <div className={styles.toolbar}>
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
                    <MenuItem onClick={() => onSetExpansion('boards', true)}>Boards</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('groups', true)}>Groups</MenuItem>
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
                    <MenuItem onClick={() => onSetExpansion('boards', false)}>Boards</MenuItem>
                    <MenuItem onClick={() => onSetExpansion('groups', false)}>Groups</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <MenuItem onClick={onToggleBoardHeaders}>
                {showBoardHeaders ? '✓ Show board headers' : 'Show board headers'}
              </MenuItem>
              <MenuItem onClick={onToggleGroupHeaders}>
                {showGroupHeaders ? '✓ Show group headers' : 'Show group headers'}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </th>
  );
}

export default memo(PurchaseOrdersTableControls);
