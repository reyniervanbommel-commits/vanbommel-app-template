import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const CARD_WIDTH = 280;

const useStyles = makeStyles({
  card: {
    position: 'fixed',
    zIndex: 1000,
    width: `${CARD_WIDTH}px`,
    maxWidth: `calc(100vw - 16px)`,
    pointerEvents: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    flexShrink: 0,
  },
  value: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    textAlign: 'right',
    overflowWrap: 'anywhere',
  },
});

function HoverRow({ label, value, rowClassName, labelClassName, valueClassName }) {
  return (
    <div className={rowClassName}>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function clampLeft(left) {
  const minLeft = 8;
  const maxLeft = typeof window === 'undefined'
    ? left
    : Math.max(minLeft, window.innerWidth - CARD_WIDTH - 8);
  return Math.min(Math.max(minLeft, left), maxLeft);
}

function PurchaseOrderColumnHeaderHoverCard({ hover, model }) {
  const styles = useStyles();
  if (!hover || !model || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="tooltip"
      className={styles.card}
      style={{ top: hover.top, left: clampLeft(hover.left) }}
    >
      <div className={styles.title}>{model.title}</div>
      {model.rows.map((row) => (
        <HoverRow
          key={row.label}
          label={row.label}
          value={row.value}
          rowClassName={styles.row}
          labelClassName={styles.label}
          valueClassName={styles.value}
        />
      ))}
    </div>,
    document.body,
  );
}

export default memo(PurchaseOrderColumnHeaderHoverCard);
