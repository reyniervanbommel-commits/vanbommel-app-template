import React, { memo, useCallback } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { COLLAPSED_COLUMN_WIDTH } from '../../utils/collapsedColumnUtils';

const useStyles = makeStyles({
  cell: {
    width: `${COLLAPSED_COLUMN_WIDTH}px`,
    minWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
    maxWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
    padding: '0',
    margin: '0',
    overflow: 'visible',
    boxSizing: 'border-box',
    fontSize: '0',
    lineHeight: 0,
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    backgroundColor: 'transparent',
    cursor: 'col-resize',
    // Excel-style: two thin vertical lines at the boundary, not a spacer column.
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '-2px',
      width: '3px',
      boxSizing: 'border-box',
      borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
      borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
      pointerEvents: 'none',
      zIndex: 1,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '-6px',
      width: '12px',
      cursor: 'col-resize',
      zIndex: 2,
    },
    ':hover::before': {
      borderLeftColor: tokens.colorNeutralForeground2,
      borderRightColor: tokens.colorNeutralForeground2,
    },
    ':hover [data-collapsed-column-label], :focus [data-collapsed-column-label]': {
      opacity: 1,
      visibility: 'visible',
    },
  },
  bodyCell: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  // Eigen leesbaar label i.p.v. het native `title`-tooltip: dat verschijnt traag en de
  // hover-strook (12px) is te smal om de muis lang genoeg stil te houden om het te lezen.
  label: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '4px',
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius('4px'),
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    boxShadow: tokens.shadow4,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightRegular,
    whiteSpace: 'nowrap',
    opacity: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: 20,
    transitionProperty: 'opacity, visibility',
    transitionDuration: '0.1s',
  },
});

function PurchaseOrderCollapsedColumnCell({
  columnKey,
  columnLabel = '',
  variant = 'body',
  className = '',
  cellStyle,
  onExpandColumn,
}) {
  const styles = useStyles();
  const CellTag = variant === 'header' ? 'th' : 'td';
  const handleExpand = useCallback(() => {
    onExpandColumn?.(columnKey);
  }, [columnKey, onExpandColumn]);
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleExpand();
    }
  }, [handleExpand]);
  const variantClassName = variant === 'header' ? styles.headerCell : styles.bodyCell;
  const ariaLabel = columnLabel
    ? `Show column ${columnLabel}`
    : 'Show column';

  return (
    <CellTag
      className={[styles.cell, variantClassName, className].filter(Boolean).join(' ')}
      style={{
        width: `${COLLAPSED_COLUMN_WIDTH}px`,
        minWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
        maxWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
        padding: 0,
        ...(cellStyle || {}),
      }}
      data-col-key={columnKey}
      data-collapsed-column="true"
      {...(variant === 'header' ? {
        role: 'button',
        tabIndex: 0,
        title: ariaLabel,
        'aria-label': ariaLabel,
        onClick: handleExpand,
        onKeyDown: handleKeyDown,
      } : {})}
    >
      {variant === 'header' ? (
        <span className={styles.label} data-collapsed-column-label="true" aria-hidden="true">
          {ariaLabel}
        </span>
      ) : null}
    </CellTag>
  );
}

export function PurchaseOrderCollapsedColumnHeaderCell(props) {
  return <PurchaseOrderCollapsedColumnCell {...props} variant="header" />;
}

export default memo(PurchaseOrderCollapsedColumnCell);
