import React, { useCallback } from 'react';
import {
  Menu,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ColorRegular } from '@fluentui/react-icons';
import ColorPalettePicker from '../../shared/ColorPalettePicker';

const useStyles = makeStyles({
  colorWrap: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
  },
});

export default function PurchaseOrderViewTabGroupColorItem({
  columnKey,
  label,
  selectedColor,
  onSetGroupColor,
}) {
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
        <MenuItem icon={<ColorRegular />}>{label}</MenuItem>
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
