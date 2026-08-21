import React, { useCallback, useState } from 'react';
import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Slider,
  Text,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { STATUS_COLOR_PALETTE } from '../../utils/statusColumnUtils';
import { applyOpacity, getOpacityPercent, getRgbHex } from '../../utils/hexColor';

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
    position: 'relative',
    width: '32px',
    height: '28px',
    ...shorthands.borderRadius('4px'),
    ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke1),
    cursor: 'pointer',
    ...shorthands.padding('0'),
    overflow: 'hidden',
    backgroundImage: `repeating-conic-gradient(${tokens.colorNeutralStroke2} 0% 25%, ${tokens.colorNeutralBackground1} 0% 50%)`,
    backgroundSize: '8px 8px',
    ':hover': {
      ...shorthands.borderColor(tokens.colorNeutralForeground3),
    },
  },
  triggerFill: {
    position: 'absolute',
    inset: 0,
  },
  popoverSurface: {
    ...shorthands.padding('8px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    minWidth: '168px',
  },
  pickerBody: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    minWidth: 0,
    maxWidth: '168px',
  },
  opacityRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    minWidth: 0,
  },
  opacitySlider: {
    flexGrow: 1,
    minWidth: '72px',
    maxWidth: '100%',
  },
  opacityValue: {
    width: '32px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    textAlign: 'right',
  },
});

function ColorOpacityControl({ color, onChange }) {
  const styles = useStyles();
  const percent = getOpacityPercent(color);
  const hasColor = Boolean(getRgbHex(color));

  const handleChange = useCallback((_, data) => {
    if (!hasColor) return;
    onChange(applyOpacity(color, data.value));
  }, [color, hasColor, onChange]);

  return (
    <div className={styles.opacityRow}>
      <Text size={200}>Opacity</Text>
      <Slider
        className={styles.opacitySlider}
        aria-label="Opacity"
        min={0}
        max={100}
        value={percent}
        size="small"
        disabled={!hasColor}
        onChange={handleChange}
      />
      <Text size={200} className={styles.opacityValue}>{`${percent}%`}</Text>
    </div>
  );
}

function ColorSwatchButton({ color, selected, compact, onSelect }) {
  const styles = useStyles();
  const swatchClass = compact ? styles.colorSwatchCompact : styles.colorSwatch;
  const handleClick = useCallback(() => onSelect(color), [color, onSelect]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={mergeClasses(swatchClass, selected ? styles.colorSwatchSelected : undefined)}
      style={{ backgroundColor: color }}
      aria-label={`Pick color ${color}`}
      onClick={handleClick}
    />
  );
}

function ColorPaletteGrid({ selectedColor, onSelect, ariaLabel = 'Pick color', compact = false }) {
  const styles = useStyles();
  const paletteClass = compact ? styles.colorPaletteCompact : styles.colorPalette;
  const selectedRgb = getRgbHex(selectedColor);
  const opacity = getOpacityPercent(selectedColor);

  const handleSelect = useCallback((color) => {
    onSelect(applyOpacity(color, opacity));
  }, [onSelect, opacity]);

  return (
    <div className={paletteClass} role="listbox" aria-label={ariaLabel}>
      {SELECTABLE_STATUS_COLORS.map((color) => (
        <ColorSwatchButton
          key={color}
          color={color}
          selected={selectedRgb === color}
          compact={compact}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

function ColorPaletteBody({ selectedColor, onSelect, ariaLabel, compact = false }) {
  const styles = useStyles();
  return (
    <div className={styles.pickerBody}>
      <ColorPaletteGrid
        selectedColor={selectedColor}
        onSelect={onSelect}
        ariaLabel={ariaLabel}
        compact={compact}
      />
      <ColorOpacityControl color={selectedColor} onChange={onSelect} />
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

  if (layout === 'grid' || layout === 'compact') {
    return (
      <ColorPaletteBody
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
        <button type="button" className={styles.triggerSwatch} aria-label={ariaLabel}>
          <span className={styles.triggerFill} style={{ backgroundColor: selectedColor || 'transparent' }} />
        </button>
      </PopoverTrigger>
      <PopoverSurface className={styles.popoverSurface}>
        <ColorPaletteBody
          selectedColor={selectedColor}
          onSelect={onSelect}
          ariaLabel={ariaLabel}
        />
      </PopoverSurface>
    </Popover>
  );
}
