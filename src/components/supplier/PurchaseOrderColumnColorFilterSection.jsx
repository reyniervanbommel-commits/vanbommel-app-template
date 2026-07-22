import React, { useCallback } from 'react';
import { Text } from '@fluentui/react-components';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';
import { NO_COLOR_FILTER_VALUE } from './columnFilterColorUtils';

/**
 * "Filter by color"-blok: toont de beschikbare kleuren van de kolom (status- of
 * conditional-formatting-kleuren) als swatches en filtert op de gekozen kleuren.
 * De laatste swatch ("No color") matcht rijen zonder opmaakkleur/status.
 * Alleen zichtbaar wanneer de kolom kleuren kent.
 */
function ColorSwatch({ styles, color, active, columnLabel, onToggle }) {
  const handleClick = useCallback(() => onToggle(color), [color, onToggle]);
  const isNoColor = color === NO_COLOR_FILTER_VALUE;
  const baseClass = isNoColor
    ? `${styles.colorFilterSwatch} ${styles.colorFilterNoColorSwatch}`
    : styles.colorFilterSwatch;
  const className = active ? `${baseClass} ${styles.colorFilterSwatchActive}` : baseClass;
  const label = isNoColor
    ? `Filter ${columnLabel} by no color`
    : `Filter ${columnLabel} by color ${color}`;
  return (
    <button
      type="button"
      className={className}
      style={isNoColor ? undefined : { backgroundColor: color }}
      aria-pressed={active}
      aria-label={label}
      title={isNoColor ? 'No color' : color}
      onClick={handleClick}
    />
  );
}

export default function PurchaseOrderColumnColorFilterSection({
  styles,
  columnLabel,
  availableColors = [],
  selectedColors = [],
  onToggleColor,
  onClear,
  closeSubmenu,
  onMouseEnter,
}) {
  if (!availableColors.length) return null;
  const selectedSet = new Set(selectedColors);

  return (
    <div className={styles.filterBlock} onMouseEnter={onMouseEnter}>
      <Text className={styles.filterSectionLabel}>Filter by color</Text>
      <div className={styles.colorFilterSwatches}>
        {availableColors.map((color) => (
          <ColorSwatch
            key={color}
            styles={styles}
            color={color}
            active={selectedSet.has(color)}
            columnLabel={columnLabel}
            onToggle={onToggleColor}
          />
        ))}
      </div>
      {selectedColors.length ? (
        <div className={styles.filterActionRow}>
          <PurchaseOrderColumnFilterMenuButton
            className={styles.filterClearButton}
            size="extra-small"
            appearance="outline"
            closeSubmenu={closeSubmenu}
            onClick={onClear}
          >
            Clear color filter
          </PurchaseOrderColumnFilterMenuButton>
        </div>
      ) : null}
    </div>
  );
}
