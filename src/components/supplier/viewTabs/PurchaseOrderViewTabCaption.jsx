import React from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { tabUnderlineColor, truncateTabLabel } from '../../../utils/viewTabs';
import UnsavedYellowDot from '../UnsavedYellowDot';

const useStyles = makeStyles({
  inner: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'flex-start',
    minWidth: 0,
    ...shorthands.gap('4px'),
  },
  label: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: 1,
  },
  colorBar: {
    height: '3px',
    width: '100%',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginTop: '2px',
  },
  colorBarActive: {
    height: '5px',
  },
  colorBarFallback: {
    backgroundColor: tokens.colorBrandStroke1,
  },
  colorBarFallbackMuted: {
    backgroundColor: `color-mix(in srgb, ${tokens.colorBrandStroke1} 25%, transparent)`,
  },
});

function TabColorBar({ color, isActive, styles }) {
  const backgroundColor = tabUnderlineColor(color, isActive);
  return (
    <span
      className={mergeClasses(
        styles.colorBar,
        isActive && styles.colorBarActive,
        !backgroundColor && (isActive ? styles.colorBarFallback : styles.colorBarFallbackMuted),
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    />
  );
}

export default function PurchaseOrderViewTabCaption({
  label,
  color = '',
  isActive = false,
  hasUnsharedExtra = false,
}) {
  const styles = useStyles();
  return (
    <span className={styles.inner}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{truncateTabLabel(label)}</span>
        {hasUnsharedExtra ? <UnsavedYellowDot testId="tab-unshared-filter-dot" /> : null}
      </span>
      <TabColorBar color={color} isActive={isActive} styles={styles} />
    </span>
  );
}
