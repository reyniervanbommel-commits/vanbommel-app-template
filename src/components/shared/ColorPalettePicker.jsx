import React, { useCallback, useState } from 'react';
import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { STATUS_COLOR_PALETTE } from '../../utils/statusColumnUtils';

export const SELECTABLE_STATUS_COLORS = STATUS_COLOR_PALETTE.slice(1);

const useStyles = makeStyles({
  colorPalette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 24px)',
    ...shorthands.gap('4px'),
    justifyContent: 'start',
  },
  colorPaletteCompact: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('3px'),
    alignItems: 'center',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    ...shorthands.borderRadius('4px'),
    ...shorthands.border('2px', 'solid', 'transparent'),
    cursor: 'pointer',
    ...shorthands.padding('0'),
    ':hover': {
      ...shorthands.borderColor(tokens.colorNeutralStroke1),
    },
  },
  colorSwatchCompact: {
    width: '18px',
    height: '18px',
    ...shorthands.borderRadius('3px'),
    ...shorthands.border('1.5px', 'solid', 'transparent'),
    cursor: 'pointer',
    ...shorthands.padding('0'),
    flexShrink: 0,
    ':hover': {
      ...shorthands.borderColor(tokens.colorNeutralStroke1),
    },
  },
  colorSwatchSelected: {
    ...shorthands.borderColor(tokens.colorNeutralForeground1),
  },
  triggerSwatch: {
    width: '32px',
    height: '28px',
    ...shorthands.borderRadius('4px'),
    ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke1),
    cursor: 'pointer',
    ...shorthands.padding('0'),
    ':hover': {
      ...shorthands.borderColor(tokens.colorNeutralForeground3),
    },
  },
  popoverSurface: {
    ...shorthands.padding('8px'),
  },
});

function ColorPaletteGrid({ selectedColor, onSelect, ariaLabel = 'Pick color', compact = false }) {
  const styles = useStyles();
  const swatchClass = compact ? styles.colorSwatchCompact : styles.colorSwatch;
  const paletteClass = compact ? styles.colorPaletteCompact : styles.colorPalette;

  return (
    <div className={paletteClass} role="listbox" aria-label={ariaLabel}>
      {SELECTABLE_STATUS_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="option"
          aria-selected={selectedColor === color}
          className={mergeClasses(
            swatchClass,
            selectedColor === color ? styles.colorSwatchSelected : undefined,
          )}
          style={{ backgroundColor: color }}
          aria-label={`Pick color ${color}`}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
}

export default function ColorPalettePicker({
  selectedColor,
  onSelect,
  layout = 'grid',
  ariaLabel = 'Pick color',
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((color) => {
    onSelect(color);
    setOpen(false);
  }, [onSelect]);

  if (layout === 'grid' || layout === 'compact') {
    return (
      <ColorPaletteGrid
        selectedColor={selectedColor}
        onSelect={onSelect}
        ariaLabel={ariaLabel}
        compact={layout === 'compact'}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={(_, data) => setOpen(Boolean(data.open))}>
      <PopoverTrigger disableButtonEnhancement>
        <button
          type="button"
          className={styles.triggerSwatch}
          style={{ backgroundColor: selectedColor }}
          aria-label={ariaLabel}
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.popoverSurface}>
        <ColorPaletteGrid
          selectedColor={selectedColor}
          onSelect={handleSelect}
          ariaLabel={ariaLabel}
        />
      </PopoverSurface>
    </Popover>
  );
}
